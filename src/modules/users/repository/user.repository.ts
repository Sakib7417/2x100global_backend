import { prisma } from '../../../prisma/client';
import { User, Prisma } from '@prisma/client';

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id, deletedAt: null },
      include: { sponsor: true, wallets: true },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findByReferralCode(referralCode: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { referralCode },
    });
  }

  async findAll(options: { page: number; limit: number; search?: string; role?: string; status?: string }) {
    const { page, limit, search, role, status } = options;
    const where: Prisma.UserWhereInput = { deletedAt: null };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) where.role = role as any;
    if (status) where.status = status as any;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { wallets: true },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async updateStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { status },
    });
  }

  async toggleAutoTrade(id: string): Promise<User> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error('User not found');
    return prisma.user.update({
      where: { id },
      data: { autoTradeStatus: !user.autoTradeStatus },
    });
  }

  async getDashboardSummary(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallets: true,
        referrals: { where: { deletedAt: null } },
        referralAsReferred: { include: { sponsor: true } },
        _count: { select: { referrals: true } },
      },
    });

    if (!user) throw new Error('User not found');

    const directReferrals = await prisma.referral.findFirst({
      where: { sponsorId: userId },
    });

    const teamSize = await this.countTeamSize(userId);

    return {
      user,
      directReferrals: directReferrals?.directReferralCount || 0,
      teamSize,
    };
  }

  async countTeamSize(userId: string): Promise<number> {
    const directReferrals = await prisma.user.findMany({
      where: { sponsorId: userId },
      select: { id: true },
    });

    let total = directReferrals.length;
    for (const ref of directReferrals) {
      total += await this.countTeamSize(ref.id);
    }
    return total;
  }
}

export const userRepository = new UserRepository();
