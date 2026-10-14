import { walletRepository } from '../repository/wallet.repository';
import { WALLET_ERRORS } from '../constants/wallet.constants';
import {
  BadRequestError,
  NotFoundError,
} from '../../../utils/errors';
import { WalletType } from '@prisma/client';

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
  async creditWallet(userId: string, type: WalletType, amount: number) {
    const wallet = await walletRepository.findByUserIdAndType(userId, type);
    if (!wallet) {
      throw new NotFoundError(WALLET_ERRORS.WALLET_NOT_FOUND);
    }

    const beforeBalance = Number(wallet.balance);
    const updatedWallet = await walletRepository.creditWallet(wallet.id, amount);

    return {
      wallet: updatedWallet,
      beforeBalance,
      afterBalance: Number(updatedWallet.balance),
    };
  }

  /**
   * Debit wallet (internal use)
   */
  async debitWallet(userId: string, type: WalletType, amount: number) {
    const wallet = await walletRepository.findByUserIdAndType(userId, type);
    if (!wallet) {
      throw new NotFoundError(WALLET_ERRORS.WALLET_NOT_FOUND);
    }

    const beforeBalance = Number(wallet.balance);
    if (beforeBalance < amount) {
      throw new BadRequestError(WALLET_ERRORS.INSUFFICIENT_BALANCE);
    }

    const updatedWallet = await walletRepository.debitWallet(wallet.id, amount);

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
}

export const walletService = new WalletService();
export default walletService;
