import { walletRepository } from '../repository/wallet.repository';
import { ledgerService } from '../../ledger/service/ledger.service';
import { WALLET_ERRORS } from '../constants/wallet.constants';
import prisma from '../../../config/database';
import {
  BadRequestError,
  NotFoundError,
} from '../../../utils/errors';
import {
  LedgerType,
  Prisma,
  ReferenceType,
  TradeStatus,
  WalletType,
} from '@prisma/client';

/**
 * Wallets whose balance the user can move into PRINCIPAL as new stake.
 * POOL_BONUS included per business rule — note it bypasses the pool
 * admin-approval gate, but the moved amount inherits the trade-plan
 * early-exit lock like any fresh principal.
 */
export const TRANSFERABLE_TO_PRINCIPAL: WalletType[] = [
  WalletType.REFERRAL,
  WalletType.POOL_BONUS,
  WalletType.RANK_BONUS,
  WalletType.TRADING_PROFIT,
  WalletType.DEPOSIT_BONUS,
];

export class WalletService {
  /**
   * Get wallet by type for user
   */
  async getWallet(userId: string, type?: WalletType) {
    if (type) {
      const wallet = await walletRepository.findByUserIdAndType(userId, type);
      if (!wallet) {
        throw new NotFoundError(WALLET_ERRORS.WALLET_NOT_FOUND);
      }
      return wallet;
    }
    return walletRepository.findByUserId(userId);
  }

  /**
   * Get wallet summary for user
   */
  async getWalletSummary(userId: string) {
    const wallets = await walletRepository.findByUserId(userId);
    
    const summary: Record<string, any> = {};
    let totalBalance = 0;

    wallets.forEach((wallet) => {
      summary[wallet.type.toLowerCase()] = {
        balance: wallet.balance.toString(),
        totalCredit: wallet.totalCredit.toString(),
        totalDebit: wallet.totalDebit.toString(),
      };
      totalBalance += Number(wallet.balance);
    });

    summary.totalBalance = totalBalance.toString();

    return summary;
  }

  /**
   * Initialize wallets for new user
   */
  async initializeWallets(userId: string) {
    return walletRepository.createAllWallets(userId);
  }

  /**
   * Credit wallet (internal use)
   */
  async creditWallet(
    userId: string,
    type: WalletType,
    amount: number,
    tx?: Prisma.TransactionClient,
  ) {
    const wallet = await walletRepository.findByUserIdAndType(userId, type, tx);
    if (!wallet) {
      throw new NotFoundError(WALLET_ERRORS.WALLET_NOT_FOUND);
    }

    const beforeBalance = Number(wallet.balance);
    const updatedWallet = await walletRepository.creditWallet(wallet.id, amount, tx);

    return {
      wallet: updatedWallet,
      beforeBalance,
      afterBalance: Number(updatedWallet.balance),
    };
  }

  /**
   * Debit wallet (internal use)
   */
  async debitWallet(
    userId: string,
    type: WalletType,
    amount: number,
    tx?: Prisma.TransactionClient,
  ) {
    const wallet = await walletRepository.findByUserIdAndType(userId, type, tx);
    if (!wallet) {
      throw new NotFoundError(WALLET_ERRORS.WALLET_NOT_FOUND);
    }

    const beforeBalance = Number(wallet.balance);
    if (beforeBalance < amount) {
      throw new BadRequestError(WALLET_ERRORS.INSUFFICIENT_BALANCE);
    }

    const updatedWallet = await walletRepository.debitWallet(wallet.id, amount, tx);

    return {
      wallet: updatedWallet,
      beforeBalance,
      afterBalance: Number(updatedWallet.balance),
    };
  }

  /**
   * Get wallet balance
   */
  async getBalance(userId: string, type: WalletType) {
    const wallet = await walletRepository.findByUserIdAndType(userId, type);
    if (!wallet) {
      throw new NotFoundError(WALLET_ERRORS.WALLET_NOT_FOUND);
    }
    return Number(wallet.balance);
  }

  async getWalletBalances(userId: string): Promise<Record<string, string>> {
    const wallets = await walletRepository.findByUserId(userId);
    const map: Record<string, string> = {};
    for (const wallet of wallets) {
      map[wallet.type] = wallet.balance.toString();
    }
    return map;
  }

  /**
   * Restart the trade plan for penalty purposes: any fresh money entering
   * PRINCIPAL (deposit approval, wallet transfer-in) moves the baseline
   * forward so the user must complete the plan's penalty-free threshold
   * again before withdrawing without the 40% penalty.
   */
  async resetTradeCountBaseline(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? prisma;
    const completed = await client.trade.count({
      where: { userId, status: TradeStatus.COMPLETED },
    });
    await client.user.update({
      where: { id: userId },
      data: { tradeCountBaseline: completed },
    });
    return completed;
  }

  /**
   * Move balance from a bonus wallet into PRINCIPAL (compound the stake).
   * Atomic: debit source, credit principal, paired COMPOUND_TRANSFER
   * ledger entries, and the trade-count baseline restarts — moved money
   * is new stake and carries the same early-exit rules as a deposit.
   */
  async transferToPrincipal(
    userId: string,
    sourceType: WalletType,
    amount: number,
  ) {
    if (!TRANSFERABLE_TO_PRINCIPAL.includes(sourceType)) {
      throw new BadRequestError(WALLET_ERRORS.INVALID_WALLET_TYPE);
    }
    if (!(amount > 0)) {
      throw new BadRequestError(WALLET_ERRORS.ZERO_AMOUNT);
    }

    return prisma.$transaction(async (tx) => {
      const debit = await this.debitWallet(userId, sourceType, amount, tx);
      const credit = await this.creditWallet(
        userId, WalletType.PRINCIPAL, amount, tx,
      );

      await ledgerService.createEntry(
        {
          userId,
          walletId: debit.wallet.id,
          type: LedgerType.COMPOUND_TRANSFER,
          credit: 0,
          debit: amount,
          beforeBalance: debit.beforeBalance,
          afterBalance: debit.afterBalance,
          description: `Moved to principal wallet (${sourceType.toLowerCase()})`,
          referenceType: ReferenceType.WALLET,
        },
        tx,
      );
      await ledgerService.createEntry(
        {
          userId,
          walletId: credit.wallet.id,
          type: LedgerType.COMPOUND_TRANSFER,
          credit: amount,
          debit: 0,
          beforeBalance: credit.beforeBalance,
          afterBalance: credit.afterBalance,
          description: `Compounded from ${sourceType.toLowerCase()} wallet`,
          referenceType: ReferenceType.WALLET,
        },
        tx,
      );

      const baseline = await this.resetTradeCountBaseline(userId, tx);
      return {
        sourceWallet: sourceType,
        amount,
        principalBalance: credit.afterBalance,
        tradeCountBaseline: baseline,
      };
    });
  }
}

export const walletService = new WalletService();
export default walletService;
