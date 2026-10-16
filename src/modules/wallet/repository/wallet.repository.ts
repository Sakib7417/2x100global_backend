import { Prisma, PrismaClient, Wallet, WalletType } from '@prisma/client';

const prisma = new PrismaClient();

type TxClient = Prisma.TransactionClient;

export class WalletRepository {
  /**
   * Find wallet by user ID and type
   */
  async findByUserIdAndType(
    userId: string,
    type: WalletType,
    tx?: TxClient,
  ): Promise<Wallet | null> {
    const client = tx ?? prisma;
    return client.wallet.findUnique({
      where: {
        userId_type: {
          userId,
          type,
        },
      },
    });
  }

  /**
   * Find all wallets by user ID
   */
  async findByUserId(userId: string): Promise<Wallet[]> {
    return prisma.wallet.findMany({
      where: { userId },
      orderBy: { type: 'asc' },
    });
  }

  /**
   * Find wallet by ID
   */
  async findById(id: string, tx?: TxClient): Promise<Wallet | null> {
    const client = tx ?? prisma;
    return client.wallet.findUnique({
      where: { id },
    });
  }

  /**
   * Create wallet
   */
  async createWallet(userId: string, type: WalletType): Promise<Wallet> {
    return prisma.wallet.create({
      data: {
        userId,
        type,
        balance: 0,
        totalCredit: 0,
        totalDebit: 0,
      },
    });
  }

  /**
   * Create all wallets for a user
   */
  async createAllWallets(userId: string): Promise<Wallet[]> {
    const walletTypes: WalletType[] = [
      WalletType.PRINCIPAL,
      WalletType.REFERRAL,
      WalletType.TRADING_PROFIT,
      WalletType.RANK_BONUS,
      WalletType.POOL_BONUS,
      WalletType.ADMIN_COMMISSION,
    ];

    const wallets = await Promise.all(
      walletTypes.map((type) => this.createWallet(userId, type))
    );

    return wallets;
  }

  /**
   * Update wallet balance
   */
  async updateBalance(
    id: string,
    balance: number,
    totalCredit: number,
    totalDebit: number,
    tx?: TxClient
  ): Promise<Wallet> {
    const client = tx ?? prisma;
    return client.wallet.update({
      where: { id },
      data: {
        balance,
        totalCredit,
        totalDebit,
      },
    });
  }

  /**
   * Credit wallet
   */
  async creditWallet(id: string, amount: number, tx?: TxClient): Promise<Wallet> {
    const wallet = await this.findById(id, tx);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const newBalance = Number(wallet.balance) + amount;
    const newTotalCredit = Number(wallet.totalCredit) + amount;

    return this.updateBalance(id, newBalance, newTotalCredit, Number(wallet.totalDebit), tx);
  }

  /**
   * Debit wallet
   */
  async debitWallet(id: string, amount: number, tx?: TxClient): Promise<Wallet> {
    const wallet = await this.findById(id, tx);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const newBalance = Number(wallet.balance) - amount;
    const newTotalDebit = Number(wallet.totalDebit) + amount;

    if (newBalance < 0) {
      throw new Error('Insufficient balance');
    }

    return this.updateBalance(id, newBalance, Number(wallet.totalCredit), newTotalDebit, tx);
  }

  /**
   * Get wallet summary for a user
   */
  async getWalletSummary(userId: string): Promise<Wallet[]> {
    return this.findByUserId(userId);
  }
}

export const walletRepository = new WalletRepository();
