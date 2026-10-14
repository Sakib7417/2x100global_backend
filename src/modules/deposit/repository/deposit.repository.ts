import { PrismaClient, Deposit, DepositStatus } from '@prisma/client';
import prisma from '../../../config/database';

export class DepositRepository {
  /**
   * Create deposit
   */
  async create(data: {
    userId: string;
    amount: number;
    transactionHash: string;
    senderAddress: string;
    receiverAddress: string;
    tokenContract: string;
    network: string;
    status?: DepositStatus;
    bonusAmount?: number;
    requiredConfirmations?: number;
  }): Promise<Deposit> {
    return prisma.deposit.create({
      data: {
        userId: data.userId,
        amount: data.amount,
        transactionHash: data.transactionHash,
        senderAddress: data.senderAddress,
        receiverAddress: data.receiverAddress,
        tokenContract: data.tokenContract,
        network: data.network,
        status: data.status || DepositStatus.PENDING,
        bonusAmount: data.bonusAmount || 0,
        requiredConfirmations: data.requiredConfirmations || 12,
      },
      include: {
        user: true,
      },
    });
  }

  /**
   * Find deposit by ID
   */
  async findById(id: string): Promise<Deposit | null> {
    return prisma.deposit.findUnique({
      where: { id },
      include: {
        user: true,
        referralBonuses: true,
      },
    });
  }

  /**
   * Find deposit by transaction hash
   */
  async findByTransactionHash(transactionHash: string): Promise<Deposit | null> {
    return prisma.deposit.findUnique({
      where: { transactionHash },
      include: {
        user: true,
      },
    });
  }

  /**
   * Find deposits by user ID
   */
  async findByUserId(
    userId: string,
    options: {
      status?: DepositStatus;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ deposits: Deposit[]; total: number }> {
    const { status, startDate, endDate, page = 1, limit = 10 } = options;

    const where: any = { userId };

    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [deposits, total] = await Promise.all([
      prisma.deposit.findMany({
        where,
        include: {
          user: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.deposit.count({ where }),
    ]);

    return { deposits, total };
  }

  /**
   * Find all deposits (admin)
   */
  async findAll(options: {
    status?: DepositStatus;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  } = {}): Promise<{ deposits: Deposit[]; total: number }> {
    const { status, startDate, endDate, page = 1, limit = 10 } = options;

    const where: any = {};

    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [deposits, total] = await Promise.all([
      prisma.deposit.findMany({
        where,
        include: {
          user: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.deposit.count({ where }),
    ]);

    return { deposits, total };
  }

  /**
   * Find pending deposits
   */
  async findPendingDeposits(): Promise<Deposit[]> {
    return prisma.deposit.findMany({
      where: {
        status: {
          in: [DepositStatus.PENDING, DepositStatus.VERIFIED],
        },
      },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Update deposit
   */
  async update(
    id: string,
    data: {
      status?: DepositStatus;
      transactionHash?: string;
      amount?: number;
      bonusAmount?: number;
      blockNumber?: bigint;
      confirmations?: number;
      blockchainData?: any;
      verifiedAt?: Date;
      approvedAt?: Date;
      rejectionReason?: string;
    }
  ): Promise<Deposit> {
    return prisma.deposit.update({
      where: { id },
      data,
      include: {
        user: true,
      },
    });
  }

  /**
   * Update deposit status
   */
  async updateStatus(
    id: string,
    status: DepositStatus,
    rejectionReason?: string
  ): Promise<Deposit> {
    const updateData: any = { status };

    if (status === DepositStatus.VERIFIED) {
      updateData.verifiedAt = new Date();
    }
    if (status === DepositStatus.APPROVED) {
      updateData.approvedAt = new Date();
    }
    if (status === DepositStatus.REJECTED && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    return prisma.deposit.update({
      where: { id },
      data: updateData,
      include: {
        user: true,
      },
    });
  }

  /**
   * Get deposit statistics
   */
  async getStatistics(userId?: string): Promise<{
    totalDeposits: number;
    totalAmount: number;
    pendingDeposits: number;
    approvedDeposits: number;
    rejectedDeposits: number;
  }> {
    const where = userId ? { userId } : {};

    const [totalDeposits, totalAmount, pendingDeposits, approvedDeposits, rejectedDeposits] =
      await Promise.all([
        prisma.deposit.count({ where }),
        prisma.deposit.aggregate({
          where: { ...where, status: DepositStatus.APPROVED },
          _sum: { amount: true },
        }),
        prisma.deposit.count({
          where: { ...where, status: DepositStatus.PENDING },
        }),
        prisma.deposit.count({
          where: { ...where, status: DepositStatus.APPROVED },
        }),
        prisma.deposit.count({
          where: { ...where, status: DepositStatus.REJECTED },
        }),
      ]);

    return {
      totalDeposits,
      totalAmount: Number(totalAmount._sum.amount || 0),
      pendingDeposits,
      approvedDeposits,
      rejectedDeposits,
    };
  }
}

export const depositRepository = new DepositRepository();
export default depositRepository;
