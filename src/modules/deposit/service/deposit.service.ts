import { depositRepository } from '../repository/deposit.repository';
import { blockchainService } from '../../blockchain/service/blockchain.service';
import { walletService } from '../../wallet/service/wallet.service';
import { ledgerService } from '../../ledger/service/ledger.service';
import { referralService } from '../../referral/service/referral.service';
import { rankService } from '../../rank/service/rank.service';
import { settingsRepository } from '../../settings/repository/settings.repository';
import prisma from '../../../config/database';
import { ethers } from 'ethers';
import {
  DEPOSIT_ERRORS,
  MINIMUM_DEPOSIT,
  ALLOWED_DEPOSIT_AMOUNTS,
  FEE_TOLERANCE_USD,
  DEPOSIT_BONUS_RATE,
} from '../constants/deposit.constants';
import {
  SPONSOR_TRADE_BONUS_DEPOSIT_MIN,
  SPONSOR_TRADE_BONUS_DURATION_DAYS,
  SPONSOR_TRADE_BONUS_RATE,
} from '../../trading/constants/trading.constants';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UpstreamError,
} from '../../../utils/errors';
import { CreateDepositDTO, DepositQueryDTO } from '../types/deposit.types';
import { DepositStatus, WalletType, LedgerType, ReferenceType } from '@prisma/client';

export class DepositService {
  /**
   * Get the platform deposit wallet address for the user-facing deposit form.
   *
   * Sourced from the admin-managed `DEPOSIT_WALLET_ADDRESS` setting, falling
   * back to the `DEPOSIT_WALLET_ADDRESS` env var. Returns null when neither is
   * configured so the UI can show a "not configured" state rather than a
   * broken form.
   */
  async getDepositWalletAddress(): Promise<string | null> {
    return settingsRepository.getRequiredDepositWallet();
  }

  /**
   * Flat deposit bonus rate — 5% on all deposit amounts.
   */
  private getDepositBonusRate(): number {
    return DEPOSIT_BONUS_RATE;
  }

  /**
   * Create deposit request
   */
  async createDeposit(userId: string, data: CreateDepositDTO) {
    const amount = parseFloat(data.amount);

    // Validate minimum deposit
    if (amount < MINIMUM_DEPOSIT) {
      throw new BadRequestError(DEPOSIT_ERRORS.MINIMUM_DEPOSIT);
    }

    // Only fixed deposit packages are allowed
    if (!ALLOWED_DEPOSIT_AMOUNTS.includes(amount as (typeof ALLOWED_DEPOSIT_AMOUNTS)[number])) {
      throw new BadRequestError(DEPOSIT_ERRORS.INVALID_PACKAGE);
    }

    // Check for duplicate transaction hash
    const existingDeposit = await depositRepository.findByTransactionHash(data.transactionHash);
    if (existingDeposit) {
      throw new ConflictError(DEPOSIT_ERRORS.DUPLICATE_TRANSACTION);
    }

    // Calculate flat deposit bonus (5%)
    const bonusAmount = amount * this.getDepositBonusRate();

    // Create deposit record
    const deposit = await depositRepository.create({
      userId,
      amount,
      transactionHash: data.transactionHash,
      senderAddress: data.senderAddress,
      receiverAddress: data.receiverAddress,
      tokenContract: data.tokenContract,
      network: data.network,
      bonusAmount,
      status: DepositStatus.PENDING,
      requiredConfirmations: parseInt(process.env.REQUIRED_CONFIRMATIONS || '12'),
    });

    // Trigger blockchain verification (async)
    this.verifyDeposit(deposit.id).catch((error) => {
      console.error(`Deposit verification failed for ${deposit.id}:`, error);
    });

    return deposit;
  }

  /**
   * Verify deposit with blockchain. Optionally override the stored
   * transaction hash so the user can re-enter a correct one.
   */
  async verifyDeposit(depositId: string, overrideTransactionHash?: string) {
    let deposit = await depositRepository.findById(depositId);
    if (!deposit) {
      throw new NotFoundError(DEPOSIT_ERRORS.DEPOSIT_NOT_FOUND);
    }

    // Check if already verified or approved
    if (deposit.status === DepositStatus.VERIFIED || deposit.status === DepositStatus.APPROVED) {
      throw new ConflictError(DEPOSIT_ERRORS.ALREADY_VERIFIED);
    }

    let txHashToVerify = deposit.transactionHash;

    // Allow the user to correct a wrong/missing transaction hash before verifying
    if (overrideTransactionHash && overrideTransactionHash !== deposit.transactionHash) {
      if (!/^0x[a-fA-F0-9]{64}$/.test(overrideTransactionHash)) {
        throw new BadRequestError(DEPOSIT_ERRORS.INVALID_TRANSACTION_HASH);
      }

      await depositRepository.update(deposit.id, {
        transactionHash: overrideTransactionHash,
      });

      txHashToVerify = overrideTransactionHash;
    }

    // Verify transaction with blockchain service
    const verificationResult = await blockchainService.verifyTransaction({
      transactionHash: txHashToVerify,
      toAddress: deposit.receiverAddress,
      amount: deposit.amount.toString(),
      tokenContract: deposit.tokenContract,
      network: deposit.network,
      fromAddress: deposit.senderAddress,
    });

    if (!verificationResult.verified) {
      throw new UpstreamError('Blockchain transaction verification failed: ' + verificationResult.error);
    }

    // The user should receive at least the declared amount. Token transfer
    // fees/slippage can cause a small shortfall, so we allow up to
    // FEE_TOLERANCE_USD. If the on-chain amount is larger, the user gets the
    // larger value.
    const transferEvent = verificationResult.transferEvent;
    const actualAmount = Number(ethers.formatUnits(transferEvent.value, 18));
    const declaredAmount = Number(deposit.amount);
    const shortfall = declaredAmount - actualAmount;

    if (shortfall > FEE_TOLERANCE_USD) {
      throw new BadRequestError(
        `Received amount ${actualAmount} is less than declared amount ${declaredAmount} by more than ${FEE_TOLERANCE_USD} USDT`,
      );
    }

    const finalAmount = Math.max(declaredAmount, actualAmount);
    const bonusAmount = finalAmount * this.getDepositBonusRate();

    // Update deposit with blockchain data and the final credited amount
    await depositRepository.update(deposit.id, {
      status: DepositStatus.VERIFIED,
      amount: finalAmount,
      bonusAmount,
      blockNumber: verificationResult.transaction ? BigInt(verificationResult.transaction.blockNumber) : undefined,
      confirmations: verificationResult.transaction ? verificationResult.transaction.confirmations : 12,
      blockchainData: verificationResult.transaction as any,
      verifiedAt: new Date(),
    });

    // Auto-approve deposit after verification
    await this.approveDeposit(deposit.id);

    return verificationResult;
  }

  /**
   * Approve deposit
   */
  async approveDeposit(depositId: string) {
    const deposit = await depositRepository.findById(depositId);
    if (!deposit) {
      throw new NotFoundError(DEPOSIT_ERRORS.DEPOSIT_NOT_FOUND);
    }

    // Check if already approved
    if (deposit.status === DepositStatus.APPROVED) {
      throw new ConflictError(DEPOSIT_ERRORS.ALREADY_APPROVED);
    }

    // Allow manual admin approval for pending deposits and normal approval
    // for verified deposits. Rejected or already approved deposits cannot
    // be approved again.
    if (deposit.status !== DepositStatus.PENDING && deposit.status !== DepositStatus.VERIFIED) {
      throw new ConflictError(DEPOSIT_ERRORS.CANNOT_APPROVE_PENDING);
    }

    // Credit principal wallet
    const principalResult = await walletService.creditWallet(
      deposit.userId,
      WalletType.PRINCIPAL,
      Number(deposit.amount)
    );

    // Create ledger entry for principal credit
    await ledgerService.createEntry({
      userId: deposit.userId,
      walletId: principalResult.wallet.id,
      type: LedgerType.DEPOSIT,
      credit: Number(deposit.amount),
      debit: 0,
      beforeBalance: principalResult.beforeBalance,
      afterBalance: principalResult.afterBalance,
      description: `Deposit approved - ${deposit.transactionHash}`,
      referenceId: deposit.id,
      referenceType: ReferenceType.DEPOSIT,
    });

    // Credit deposit bonus straight into the principal wallet — there is
    // no separate bonus wallet; the ledger entry keeps the bonus
    // identifiable on the same wallet.
    const bonusNum = Number(deposit.bonusAmount);
    if (bonusNum > 0) {
      const bonusResult = await walletService.creditWallet(
        deposit.userId,
        WalletType.PRINCIPAL,
        bonusNum
      );

      await ledgerService.createEntry({
        userId: deposit.userId,
        walletId: bonusResult.wallet.id,
        type: LedgerType.DEPOSIT_BONUS,
        credit: bonusNum,
        debit: 0,
        beforeBalance: bonusResult.beforeBalance,
        afterBalance: bonusResult.afterBalance,
        description: `Deposit bonus (${(this.getDepositBonusRate() * 100).toFixed(0)}%) - ${deposit.transactionHash}`,
        referenceId: deposit.id,
        referenceType: ReferenceType.DEPOSIT,
      });
    }

    // Update deposit status
    await depositRepository.updateStatus(deposit.id, DepositStatus.APPROVED);

    // Fresh money entered PRINCIPAL — restart the trade-plan counter so
    // the early-exit penalty needs another penaltyFreeAt completed trades
    await walletService.resetTradeCountBaseline(deposit.userId);

    // Process referral bonus
    await referralService.processReferralBonus(deposit.userId, Number(deposit.amount), deposit.id);

    // Activate sponsor trade bonus if the deposit meets the threshold
    // Bonus is given to BOTH the sponsor (upline) and the referred user (downline)
    const depositUser = await prisma.user.findUnique({ where: { id: deposit.userId } });
    if (Number(deposit.amount) >= SPONSOR_TRADE_BONUS_DEPOSIT_MIN) {
      const bonusExpiry = new Date();
      bonusExpiry.setDate(bonusExpiry.getDate() + SPONSOR_TRADE_BONUS_DURATION_DAYS);

      // 1. Activate bonus on the referred user (downline) who made the deposit
      await prisma.user.update({
        where: { id: deposit.userId },
        data: {
          sponsorTradeBonusExpiry: bonusExpiry,
          sponsorTradeBonusRate: SPONSOR_TRADE_BONUS_RATE,
        },
      });

      // 2. Activate bonus on the sponsor (upline) if one exists
      if (depositUser?.sponsorId) {
        await prisma.user.update({
          where: { id: depositUser.sponsorId },
          data: {
            sponsorTradeBonusExpiry: bonusExpiry,
            sponsorTradeBonusRate: SPONSOR_TRADE_BONUS_RATE,
          },
        });
      }
    }

    // Trigger rank evaluation
    await rankService.evaluateUserRank(deposit.userId);

    return depositRepository.findById(deposit.id);
  }

  /**
   * Reject deposit
   */
  async rejectDeposit(depositId: string, reason: string) {
    const deposit = await depositRepository.findById(depositId);
    if (!deposit) {
      throw new NotFoundError(DEPOSIT_ERRORS.DEPOSIT_NOT_FOUND);
    }

    // Cannot reject approved deposits
    if (deposit.status === DepositStatus.APPROVED) {
      throw new ConflictError('Cannot reject approved deposit');
    }

    await depositRepository.updateStatus(depositId, DepositStatus.REJECTED, reason);

    return depositRepository.findById(depositId);
  }

  /**
   * Get user deposits
   */
  async getUserDeposits(userId: string, query: DepositQueryDTO) {
    const options = {
      status: query.status,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 20,
    };

    return depositRepository.findByUserId(userId, options);
  }

  /**
   * Get all deposits (admin)
   */
  async getAllDeposits(query: DepositQueryDTO) {
    const options = {
      status: query.status,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 20,
    };

    return depositRepository.findAll(options);
  }

  /**
   * Get deposit by ID
   */
  async getDepositById(id: string) {
    const deposit = await depositRepository.findById(id);
    if (!deposit) {
      throw new NotFoundError(DEPOSIT_ERRORS.DEPOSIT_NOT_FOUND);
    }
    return deposit;
  }

  /**
   * Get deposit statistics
   */
  async getStatistics(userId?: string) {
    return depositRepository.getStatistics(userId);
  }

  /**
   * Retry pending deposits
   */
  async retryPendingDeposits() {
    const pendingDeposits = await depositRepository.findPendingDeposits();

    const results = [];
    for (const deposit of pendingDeposits) {
      try {
        await this.verifyDeposit(deposit.id);
        results.push({ depositId: deposit.id, success: true });
      } catch (error) {
        results.push({ depositId: deposit.id, success: false, error: (error as Error).message });
      }
    }

    return results;
  }
}

export const depositService = new DepositService();
export default depositService;
