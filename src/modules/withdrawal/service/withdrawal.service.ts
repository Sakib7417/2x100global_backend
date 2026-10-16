import { withdrawalRepository } from '../repository/withdrawal.repository';
import { walletService } from '../../wallet/service/wallet.service';
import { ledgerService } from '../../ledger/service/ledger.service';
import { blockchainService } from '../../blockchain/service/blockchain.service';
import { authRepository } from '../../auth/repository/auth.repository';
import { userService } from '../../users/service/user.service';
import prisma from '../../../config/database';
import {
  WITHDRAWAL_ERRORS,
  MINIMUM_WITHDRAWAL,
  WITHDRAWAL_FEE_PERCENTAGE,
  PRINCIPAL_PENALTY_PERCENTAGE,
} from '../constants/withdrawal.constants';
import { TOTAL_PLAN_TRADES, PENALTY_FREE_TRADE_RATIO } from '../../trading/constants/trading.constants';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UpstreamError,
} from '../../../utils/errors';
import { CreateWithdrawalDTO, WithdrawalQueryDTO } from '../types/withdrawal.types';
import { WithdrawalStatus, WalletType, LedgerType, WithdrawalWalletType, TradeStatus } from '@prisma/client';

export class WithdrawalService {
  /**
   * Create withdrawal request
   */
  async createWithdrawal(userId: string, data: CreateWithdrawalDTO) {
    const amount = parseFloat(data.amount);

    // Validate minimum withdrawal
    if (amount < MINIMUM_WITHDRAWAL) {
      throw new BadRequestError(WITHDRAWAL_ERRORS.MINIMUM_WITHDRAWAL);
    }

    // Get user to check eligibility
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Withdraw password must be set, the 24h post-change lock must have
    // expired, and the submitted password must match.
    await userService.assertWithdrawalAllowed(userId, data.withdrawPassword);

    // Map WithdrawalWalletType to WalletType
    const walletType = data.walletType as unknown as WalletType;

    // Pool bonus withdrawals require admin approval via pool bonus request API
    if (walletType === WalletType.POOL_BONUS) {
      throw new BadRequestError('Pool bonus withdrawals require admin approval. Please submit a pool bonus request instead.');
    }

    // Check balance
    const balance = await walletService.getBalance(userId, walletType);
    if (balance < amount) {
      throw new BadRequestError(WITHDRAWAL_ERRORS.INSUFFICIENT_BALANCE);
    }

    // Calculate fee (15% flat)
    const fee = amount * WITHDRAWAL_FEE_PERCENTAGE;

    // Early-exit penalty: 40% until the user completes 70% of the trade
    // plan (140 of 200 trades) SINCE money last entered PRINCIPAL — each
    // deposit approval or wallet transfer-in restarts the counter.
    // Applies to PRINCIPAL and TRADING_PROFIT. Counted on completed
    // trades only.
    let penalty = 0;
    if (walletType === WalletType.PRINCIPAL ||
        walletType === WalletType.TRADING_PROFIT) {
      const completedTrades = await prisma.trade.count({
        where: { userId, status: TradeStatus.COMPLETED },
      });
      const effectiveCompleted = Math.max(
        0, completedTrades - (user.tradeCountBaseline ?? 0),
      );

      if (effectiveCompleted < TOTAL_PLAN_TRADES * PENALTY_FREE_TRADE_RATIO) {
        penalty = amount * PRINCIPAL_PENALTY_PERCENTAGE;
      }
    }

    const netAmount = amount - fee - penalty;
    if (netAmount <= 0) {
      throw new BadRequestError('Withdrawal amount is too low to cover fees and penalties');
    }

    // Debit wallet
    const debitResult = await walletService.debitWallet(userId, walletType, amount);

    // Create split ledger entries to match accounting standards
    let currentBalance = debitResult.beforeBalance;

    // 1. Net withdrawal ledger
    const netWithdrawalDebit = netAmount;
    const afterNetBalance = currentBalance - netWithdrawalDebit;
    await ledgerService.createEntry({
      userId,
      walletId: debitResult.wallet.id,
      type: LedgerType.WITHDRAWAL,
      credit: 0,
      debit: netWithdrawalDebit,
      beforeBalance: currentBalance,
      afterBalance: afterNetBalance,
      description: `Withdrawal request net amount to ${data.walletAddress}`,
      referenceType: 'WITHDRAWAL',
    });
    currentBalance = afterNetBalance;

    // 2. Withdrawal fee ledger
    if (fee > 0) {
      const afterFeeBalance = currentBalance - fee;
      await ledgerService.createEntry({
        userId,
        walletId: debitResult.wallet.id,
        type: LedgerType.WITHDRAWAL_FEE,
        credit: 0,
        debit: fee,
        beforeBalance: currentBalance,
        afterBalance: afterFeeBalance,
        description: `Withdrawal fee (15%)`,
        referenceType: 'WITHDRAWAL',
      });
      currentBalance = afterFeeBalance;
    }

    // 3. Penalty ledger if any
    if (penalty > 0) {
      const afterPenaltyBalance = currentBalance - penalty;
      await ledgerService.createEntry({
        userId,
        walletId: debitResult.wallet.id,
        type: LedgerType.PENALTY,
        credit: 0,
        debit: penalty,
        beforeBalance: currentBalance,
        afterBalance: afterPenaltyBalance,
        description: `Early withdrawal penalty (40% - incomplete trade plan)`,
        referenceType: 'WITHDRAWAL',
      });
      currentBalance = afterPenaltyBalance;
    }

    // Create withdrawal record
    const withdrawal = await withdrawalRepository.create({
      userId,
      walletType: data.walletType as WithdrawalWalletType,
      amount,
      fee,
      penalty,
      netAmount,
      destinationAddress: data.walletAddress,
      network: data.network || process.env.BLOCKCHAIN_NETWORK || 'bsc-mainnet',
      status: WithdrawalStatus.PENDING,
    });

    return withdrawal;
  }

  /**
   * Process withdrawal with blockchain (Admin submits hash)
   */
  async processWithdrawal(withdrawalId: string, transactionHash: string, adminId?: string) {
    const withdrawal = await withdrawalRepository.findById(withdrawalId);
    if (!withdrawal) {
      throw new NotFoundError(WITHDRAWAL_ERRORS.WITHDRAWAL_NOT_FOUND);
    }

    if (withdrawal.status === WithdrawalStatus.COMPLETED) {
      throw new ConflictError(WITHDRAWAL_ERRORS.WITHDRAWAL_ALREADY_PROCESSED);
    }

    if (withdrawal.status !== WithdrawalStatus.PENDING && withdrawal.status !== WithdrawalStatus.PROCESSING) {
      throw new ConflictError(WITHDRAWAL_ERRORS.CANNOT_PROCESS_PENDING);
    }

    // Verify blockchain transaction
    const usdtContract = process.env.USDT_CONTRACT_ADDRESS || '0x1F71139BACbf9Ab15d239342f7783C69951736f7';
    const network = withdrawal.network;

    const verificationResult = await blockchainService.verifyTransaction({
      transactionHash,
      toAddress: withdrawal.destinationAddress,
      amount: withdrawal.netAmount.toString(),
      tokenContract: usdtContract,
      network,
    });

    if (!verificationResult.verified) {
      throw new UpstreamError('Blockchain transaction verification failed');
    }

    // Extract gas fee from receipt if available
    let gasFee = 0;
    if (verificationResult.receipt && verificationResult.receipt.gasUsed) {
      const gasUsed = BigInt(verificationResult.receipt.gasUsed);
      const effectiveGasPrice = BigInt(verificationResult.receipt.effectiveGasPrice || '0');
      gasFee = Number(gasUsed * effectiveGasPrice) / 1e18; // Convert to ether/BNB
    }

    // Update withdrawal with transaction details
    const updated = await withdrawalRepository.update(withdrawal.id, {
      status: WithdrawalStatus.COMPLETED,
      transactionHash,
      blockchainData: verificationResult.transaction as any,
      processedAt: new Date(),
      gasFee,
    });

    // Save admin info who processed if provided
    if (adminId) {
      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: { adminId },
      });
    }

    return updated;
  }

  /**
   * Reject withdrawal
   */
  async rejectWithdrawal(withdrawalId: string, reason: string, adminId: string) {
    const withdrawal = await withdrawalRepository.findById(withdrawalId);
    if (!withdrawal) {
      throw new NotFoundError(WITHDRAWAL_ERRORS.WITHDRAWAL_NOT_FOUND);
    }

    if (withdrawal.status === WithdrawalStatus.COMPLETED) {
      throw new ConflictError('Cannot reject completed withdrawal');
    }

    // Refund the amount back to the same wallet
    const walletResult = await walletService.creditWallet(
      withdrawal.userId,
      withdrawal.walletType as unknown as WalletType,
      Number(withdrawal.amount)
    );

    // Create ledger entry for refund
    await ledgerService.createEntry({
      userId: withdrawal.userId,
      walletId: walletResult.wallet.id,
      type: LedgerType.REFUND,
      credit: Number(withdrawal.amount),
      debit: 0,
      beforeBalance: walletResult.beforeBalance,
      afterBalance: walletResult.afterBalance,
      description: `Withdrawal rejection refund - ${withdrawal.destinationAddress}`,
      referenceId: withdrawal.id,
      referenceType: 'WITHDRAWAL',
    });

    const updated = await withdrawalRepository.updateStatus(withdrawalId, WithdrawalStatus.REJECTED, reason);

    await prisma.withdrawal.update({
      where: { id: withdrawal.id },
      data: { adminId },
    });

    return updated;
  }

  /**
   * Get user withdrawals
   */
  async getUserWithdrawals(userId: string, query: WithdrawalQueryDTO) {
    const options = {
      status: query.status,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 20,
    };

    return withdrawalRepository.findByUserId(userId, options);
  }

  /**
   * Get all withdrawals (admin)
   */
  async getAllWithdrawals(query: WithdrawalQueryDTO) {
    const options = {
      status: query.status,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 20,
    };

    return withdrawalRepository.findAll(options);
  }

  /**
   * Get withdrawal by ID
   */
  async getWithdrawalById(id: string) {
    const withdrawal = await withdrawalRepository.findById(id);
    if (!withdrawal) {
      throw new NotFoundError(WITHDRAWAL_ERRORS.WITHDRAWAL_NOT_FOUND);
    }
    return withdrawal;
  }

  /**
   * Get withdrawal statistics
   */
  async getStatistics(userId?: string) {
    return withdrawalRepository.getStatistics(userId);
  }
}

export const withdrawalService = new WithdrawalService();
export default withdrawalService;
