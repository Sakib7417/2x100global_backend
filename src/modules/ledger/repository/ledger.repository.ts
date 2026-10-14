import { PrismaClient, Ledger, LedgerType, ReferenceType } from '@prisma/client';
import prisma from '../../../config/database';

export class LedgerRepository {
  /**
   * Create ledger entry
   */
  async create(data: {
    userId: string;
    walletId: string;
    type: LedgerType;
    credit: number;
    debit: number;
    beforeBalance: number;
    afterBalance: number;
    description?: string;
    referenceId?: string;
    referenceType?: ReferenceType;
    metadata?: any;
  }): Promise<Ledger> {
    return prisma.ledger.create({
      data: {
        userId: data.userId,
        walletId: data.walletId,
        type: data.type,
        credit: data.credit,
        debit: data.debit,
        beforeBalance: data.beforeBalance,
        afterBalance: data.afterBalance,
        description: data.description,
        referenceId: data.referenceId,
        referenceType: data.referenceType,
        metadata: data.metadata || {},
      },
    });
  }

  /**
   * Find ledger by ID
   */
  async findById(id: string): Promise<Ledger | null> {
    return prisma.ledger.findUnique({
      where: { id },
      include: {
        wallet: true,
      },
    });
  }

  /**
   * Find ledgers by user ID
   */
  async findByUserId(
    userId: string,
    options: {
      type?: LedgerType;
      walletId?: string;
      referenceId?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ ledgers: Ledger[]; total: number }> {
    const { type, walletId, referenceId, startDate, endDate, page = 1, limit = 10 } = options;

    const where: any = { userId };

    if (type) where.type = type;
    if (walletId) where.walletId = walletId;
    if (referenceId) where.referenceId = referenceId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [ledgers, total] = await Promise.all([
      prisma.ledger.findMany({
        where,
        include: {
          wallet: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.ledger.count({ where }),
    ]);

    return { ledgers, total };
  }

  /**
   * Find ledgers by wallet ID
   */
  async findByWalletId(
    walletId: string,
    options: {
      type?: LedgerType;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ ledgers: Ledger[]; total: number }> {
    const { type, page = 1, limit = 10 } = options;

    const where: any = { walletId };
    if (type) where.type = type;

    const [ledgers, total] = await Promise.all([
      prisma.ledger.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.ledger.count({ where }),
    ]);

    return { ledgers, total };
  }

  /**
   * Find ledger by reference ID
   */
  async findByReferenceId(referenceId: string): Promise<Ledger[]> {
    return prisma.ledger.findMany({
      where: { referenceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Calculate balance from ledger entries
   */
  async calculateBalance(walletId: string): Promise<number> {
    const result = await prisma.ledger.aggregate({
      where: { walletId },
      _sum: {
        credit: true,
        debit: true,
      },
    });

    const totalCredit = Number(result._sum.credit || 0);
    const totalDebit = Number(result._sum.debit || 0);

    return totalCredit - totalDebit;
  }
}

export const ledgerRepository = new LedgerRepository();
export default ledgerRepository;
