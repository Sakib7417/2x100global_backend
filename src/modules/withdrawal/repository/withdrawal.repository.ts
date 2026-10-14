import { PrismaClient, Withdrawal, WithdrawalStatus, WithdrawalWalletType } from '@prisma/client';

const prisma = new PrismaClient();

export class WithdrawalRepository {
  /**
   * Create withdrawal request
   */
  async create(data: {
    userId: string;
    walletType: WithdrawalWalletType;
    amount: number;
    fee: number;
    penalty: number;
    netAmount: number;
    destinationAddress: string;
    network: string;
    status: WithdrawalStatus;
  }): Promise<Withdrawal> {
    return prisma.withdrawal.create({
      data: {
        userId: data.userId,
        walletType: data.walletType,
        amount: data.amount,
        fee: data.fee,
        penalty: data.penalty,
        netAmount: data.netAmount,
        destinationAddress: data.destinationAddress,
        network: data.network,
        status: data.status,
      },
      include: {
        user: true,
      },
    });
  }

  /**
   * Find withdrawal by ID
   */
  async findById(id: string): Promise<Withdrawal | null> {
    return prisma.withdrawal.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });
  }

  /**
   * Find withdrawals by user ID
   */
  async findByUserId(
    userId: string,
    options: {
      status?: WithdrawalStatus;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ withdrawals: Withdrawal[]; total: number }> {
    const { status, startDate, endDate, page = 1, limit = 10 } = options;

    const where: any = { userId };

    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [withdrawals, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where,
        include: {
          user: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.withdrawal.count({ where }),
    ]);

    return { withdrawals, total };
  }

  /**
   * Find all withdrawals (admin)
   */
  async findAll(options: {
    status?: WithdrawalStatus;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  } = {}): Promise<{ withdrawals: Withdrawal[]; total: number }> {
    const { status, startDate, endDate, page = 1, limit = 10 } = options;

    const where: any = {};

    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [withdrawals, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where,
        include: {
          user: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.withdrawal.count({ where }),
    ]);

    return { withdrawals, total };
  }

  /**
   * Find pending withdrawals
   */
  async findPendingWithdrawals(): Promise<Withdrawal[]> {
    return prisma.withdrawal.findMany({
      where: {
        status: WithdrawalStatus.PENDING,
      },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Update withdrawal
   */
  async update(
    id: string,
    data: {
      status?: WithdrawalStatus;
      transactionHash?: string;
      blockchainData?: any;
      processedAt?: Date;
      rejectionReason?: string;
      gasFee?: number;
    }
  ): Promise<Withdrawal> {
    return prisma.withdrawal.update({
      where: { id },
      data,
      include: {
        user: true,
      },
    });
  }

  /**
   * Update withdrawal status
   */
  async updateStatus(id: string, status: WithdrawalStatus, rejectionReason?: string): Promise<Withdrawal> {
    const updateData: any = { status };

    if (status === WithdrawalStatus.COMPLETED) {
      updateData.processedAt = new Date();
    }
    if (status === WithdrawalStatus.REJECTED && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    return prisma.withdrawal.update({
      where: { id },
      data: updateData,
      include: {
        user: true,
      },
    });
  }

  /**
   * Get withdrawal statistics
   */
  async getStatistics(userId?: string): Promise<{
    totalWithdrawals: number;
    totalAmount: number;
    totalFees: number;
    pendingWithdrawals: number;
    processedWithdrawals: number;
    rejectedWithdrawals: number;
  }> {
    const where = userId ? { userId } : {};

    const [totalWithdrawals, totalAmount, totalFees, pendingWithdrawals, processedWithdrawals, rejectedWithdrawals] =
      await Promise.all([
        prisma.withdrawal.count({ where }),
        prisma.withdrawal.aggregate({
          where: { ...where, status: WithdrawalStatus.COMPLETED },
          _sum: { amount: true },
        }),
        prisma.withdrawal.aggregate({
          where: { ...where, status: WithdrawalStatus.COMPLETED },
          _sum: { fee: true },
        }),
        prisma.withdrawal.count({
          where: { ...where, status: WithdrawalStatus.PENDING },
        }),
        prisma.withdrawal.count({
          where: { ...where, status: WithdrawalStatus.COMPLETED },
        }),
        prisma.withdrawal.count({
          where: { ...where, status: WithdrawalStatus.REJECTED },
        }),
      ]);

    return {
      totalWithdrawals,
      totalAmount: Number(totalAmount._sum.amount || 0),
      totalFees: Number(totalFees._sum.fee || 0),
      pendingWithdrawals,
      processedWithdrawals,
      rejectedWithdrawals,
    };
  }
}

export const withdrawalRepository = new WithdrawalRepository();
export default withdrawalRepository;
