import { prisma } from '../../../prisma/client';
import {
  BlockchainTransactionStatus,
  CycleBonusStatus,
  DepositStatus,
  NotificationType,
  Prisma,
  RankLevel,
  TradeStatus,
  UserRole,
  UserStatus,
  WithdrawalStatus,
} from '@prisma/client';

interface ListOptions {
  page: number;
  limit: number;
  status?: string;
  search?: string;
}

const relatedUserSelect = {
  id: true,
  email: true,
  name: true,
  referralCode: true,
  status: true,
} as const;

const adminUserSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  country: true,
  role: true,
  referralCode: true,
  sponsorId: true,
  walletAddress: true,
  rank: true,
  autoTradeStatus: true,
  status: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  wallets: true,
  govIdType: true,
  govIdUrl: true,
  isContentCreator: true,
} as const;

export class AdminRepository {
  async getDashboardStats() {
    const [
      totalUsers,
      activeUsers,
      totalDeposits,
      pendingDeposits,
      totalWithdrawals,
      pendingWithdrawals,
      totalTrades,
      totalReferralBonuses,
      totalRankBonuses,
      totalCycleBonuses,
      totalAdminCommission,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
      prisma.deposit.count(),
      prisma.deposit.count({ where: { status: 'PENDING' } }),
      prisma.withdrawal.count(),
      prisma.withdrawal.count({ where: { status: 'PENDING' } }),
      prisma.trade.count(),
      prisma.referralBonus.count({ where: { status: 'APPROVED' } }),
      prisma.rank.count(),
      prisma.cycleBonus.count(),
      prisma.ledger.count({ where: { type: 'ADMIN_COMMISSION' } }),
    ]);

    const totalVolume = await prisma.deposit.aggregate({
      _sum: { amount: true },
    });

    return {
      totalUsers,
      activeUsers,
      totalDeposits,
      pendingDeposits,
      totalWithdrawals,
      pendingWithdrawals,
      totalTrades,
      totalReferralBonuses,
      totalRankBonuses,
      totalCycleBonuses,
      totalAdminCommission,
      totalVolume: totalVolume._sum.amount?.toString() || '0',
    };
  }

  async getAnalytics() {
    const [
      dashboard,
      walletTotals,
      completedTrades,
      tradeTotals,
      userStatuses,
      depositStatuses,
      withdrawalStatuses,
      tradeStatuses,
      referralBonusStatuses,
      cycleBonusStatuses,
      blockchainStatuses,
    ] = await Promise.all([
      this.getDashboardStats(),
      prisma.wallet.aggregate({ _sum: { balance: true } }),
      prisma.trade.count({ where: { status: TradeStatus.COMPLETED } }),
      prisma.trade.aggregate({
        where: { status: TradeStatus.COMPLETED },
        _sum: { profit: true, commission: true },
      }),
      prisma.user.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true } }),
      prisma.deposit.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.withdrawal.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.trade.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.referralBonus.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.cycleBonus.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.blockchainTransaction.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    const distribution = <T extends string>(rows: Array<{ status: T; _count: { _all: number } }>) =>
      Object.fromEntries(rows.map((row) => [row.status, row._count._all]));

    return {
      ...dashboard,
      totalWalletBalance: walletTotals._sum.balance?.toString() || '0',
      completedTrades,
      totalTradeProfit: tradeTotals._sum.profit?.toString() || '0',
      totalTradeCommission: tradeTotals._sum.commission?.toString() || '0',
      statusDistributions: {
        users: distribution(userStatuses),
        deposits: distribution(depositStatuses),
        withdrawals: distribution(withdrawalStatuses),
        trades: distribution(tradeStatuses),
        referralBonuses: distribution(referralBonusStatuses),
        cycleBonuses: distribution(cycleBonusStatuses),
        blockchain: distribution(blockchainStatuses),
      },
    };
  }

  async findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: {
        ...adminUserSelect,
        referralAsReferred: { include: { sponsor: { select: relatedUserSelect } } },
      },
    });
  }

  async listUsers(options: ListOptions & { role?: UserRole }) {
    const where: Prisma.UserWhereInput = { deletedAt: null };
    if (options.status) where.status = options.status as UserStatus;
    if (options.role) where.role = options.role;
    if (options.search) {
      where.OR = [
        { email: { contains: options.search, mode: 'insensitive' } },
        { name: { contains: options.search, mode: 'insensitive' } },
        { phone: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        orderBy: { createdAt: 'desc' },
        select: adminUserSelect,
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total, page: options.page, limit: options.limit, totalPages: Math.ceil(total / options.limit) };
  }

  async listDeposits(options: ListOptions) {
    const where: Prisma.DepositWhereInput = {};
    if (options.status) where.status = options.status as DepositStatus;
    if (options.search) {
      where.OR = [
        { transactionHash: { contains: options.search, mode: 'insensitive' } },
        { senderAddress: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [deposits, total] = await Promise.all([
      prisma.deposit.findMany({
        where,
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: relatedUserSelect } },
      }),
      prisma.deposit.count({ where }),
    ]);

    return { deposits, total, page: options.page, limit: options.limit, totalPages: Math.ceil(total / options.limit) };
  }

  async listWithdrawals(options: ListOptions) {
    const where: Prisma.WithdrawalWhereInput = {};
    if (options.status) where.status = options.status as WithdrawalStatus;
    if (options.search) {
      where.OR = [
        { transactionHash: { contains: options.search, mode: 'insensitive' } },
        { destinationAddress: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [withdrawals, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where,
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: relatedUserSelect } },
      }),
      prisma.withdrawal.count({ where }),
    ]);

    return { withdrawals, total, page: options.page, limit: options.limit, totalPages: Math.ceil(total / options.limit) };
  }

  async listTrades(options: ListOptions) {
    const where: Prisma.TradeWhereInput = {};
    if (options.status) where.status = options.status as TradeStatus;
    if (options.search) {
      where.OR = [
        { id: { contains: options.search, mode: 'insensitive' } },
        { user: { email: { contains: options.search, mode: 'insensitive' } } },
        { user: { name: { contains: options.search, mode: 'insensitive' } } },
      ];
    }
    return this.paginate(
      prisma.trade.findMany({
        where,
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: relatedUserSelect } },
      }),
      prisma.trade.count({ where }),
      options,
    );
  }

  async listWallets(options: ListOptions) {
    const where: Prisma.WalletWhereInput = {};
    if (options.status) where.user = { status: options.status as UserStatus, deletedAt: null };
    if (options.search) {
      where.OR = [
        { id: { contains: options.search, mode: 'insensitive' } },
        { user: { email: { contains: options.search, mode: 'insensitive' } } },
        { user: { name: { contains: options.search, mode: 'insensitive' } } },
      ];
    }
    return this.paginate(
      prisma.wallet.findMany({
        where,
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: relatedUserSelect } },
      }),
      prisma.wallet.count({ where }),
      options,
    );
  }

  async listReferrals(options: ListOptions) {
    const where: Prisma.ReferralWhereInput = {};
    if (options.status) where.user = { status: options.status as UserStatus, deletedAt: null };
    if (options.search) {
      where.OR = [
        { user: { email: { contains: options.search, mode: 'insensitive' } } },
        { user: { name: { contains: options.search, mode: 'insensitive' } } },
        { sponsor: { email: { contains: options.search, mode: 'insensitive' } } },
        { sponsor: { name: { contains: options.search, mode: 'insensitive' } } },
      ];
    }
    return this.paginate(
      prisma.referral.findMany({
        where,
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: relatedUserSelect },
          sponsor: { select: relatedUserSelect },
        },
      }),
      prisma.referral.count({ where }),
      options,
    );
  }

  async listRanks(options: ListOptions) {
    const where: Prisma.RankWhereInput = {};
    if (options.status) where.level = options.status as RankLevel;
    if (options.search) {
      where.OR = [
        { user: { email: { contains: options.search, mode: 'insensitive' } } },
        { user: { name: { contains: options.search, mode: 'insensitive' } } },
      ];
    }
    return this.paginate(
      prisma.rank.findMany({
        where,
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        orderBy: { achievedAt: 'desc' },
        include: { user: { select: relatedUserSelect } },
      }),
      prisma.rank.count({ where }),
      options,
    );
  }

  async listCycleBonuses(options: ListOptions) {
    const where: Prisma.CycleBonusWhereInput = {};
    if (options.status) where.status = options.status as CycleBonusStatus;
    if (options.search) {
      where.OR = [
        { user: { email: { contains: options.search, mode: 'insensitive' } } },
        { user: { name: { contains: options.search, mode: 'insensitive' } } },
      ];
    }
    return this.paginate(
      prisma.cycleBonus.findMany({
        where,
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: relatedUserSelect } },
      }),
      prisma.cycleBonus.count({ where }),
      options,
    );
  }

  async listBlockchainTransactions(options: ListOptions) {
    const where: Prisma.BlockchainTransactionWhereInput = {};
    if (options.status) where.status = options.status as BlockchainTransactionStatus;
    if (options.search) {
      where.OR = [
        { transactionHash: { contains: options.search, mode: 'insensitive' } },
        { fromAddress: { contains: options.search, mode: 'insensitive' } },
        { toAddress: { contains: options.search, mode: 'insensitive' } },
        { network: { contains: options.search, mode: 'insensitive' } },
      ];
    }
    return this.paginate(
      prisma.blockchainTransaction.findMany({
        where,
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.blockchainTransaction.count({ where }),
      options,
    );
  }

  async listNotifications(options: ListOptions) {
    const where: Prisma.NotificationWhereInput = {};
    if (options.status) {
      const normalizedStatus = options.status.toUpperCase();
      if (normalizedStatus === 'READ' || normalizedStatus === 'UNREAD') {
        where.read = normalizedStatus === 'READ';
      } else {
        where.type = options.status as NotificationType;
      }
    }
    if (options.search) {
      where.OR = [
        { title: { contains: options.search, mode: 'insensitive' } },
        { message: { contains: options.search, mode: 'insensitive' } },
        { user: { email: { contains: options.search, mode: 'insensitive' } } },
        { user: { name: { contains: options.search, mode: 'insensitive' } } },
      ];
    }
    return this.paginate(
      prisma.notification.findMany({
        where,
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: relatedUserSelect } },
      }),
      prisma.notification.count({ where }),
      options,
    );
  }

  async listAuditLogs(options: ListOptions) {
    const where: Prisma.AuditLogWhereInput = {};
    if (options.status) where.action = { equals: options.status, mode: 'insensitive' };
    if (options.search) {
      where.OR = [
        { action: { contains: options.search, mode: 'insensitive' } },
        { entity: { contains: options.search, mode: 'insensitive' } },
        { entityId: { contains: options.search, mode: 'insensitive' } },
        { user: { email: { contains: options.search, mode: 'insensitive' } } },
        { user: { name: { contains: options.search, mode: 'insensitive' } } },
      ];
    }
    return this.paginate(
      prisma.auditLog.findMany({
        where,
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: relatedUserSelect } },
      }),
      prisma.auditLog.count({ where }),
      options,
    );
  }

  async listSettings(options: ListOptions) {
    const where: Prisma.SettingWhereInput = {};
    return this.paginate(
      prisma.setting.findMany({
        where,
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        orderBy: { updatedAt: 'desc' },
        include: { updater: { select: relatedUserSelect } },
      }),
      prisma.setting.count({ where }),
      options,
    );
  }

  private async paginate<T>(itemsPromise: Prisma.PrismaPromise<T[]>, totalPromise: Prisma.PrismaPromise<number>, options: ListOptions) {
    const [items, total] = await Promise.all([itemsPromise, totalPromise]);
    return { items, total, page: options.page, limit: options.limit, totalPages: Math.ceil(total / options.limit) };
  }
}

export const adminRepository = new AdminRepository();
