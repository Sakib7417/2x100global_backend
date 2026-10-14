import { PrismaClient, Referral, ReferralBonus, DepositStatus } from '@prisma/client';

const prisma = new PrismaClient();

export class ReferralRepository {
  /**
   * Create referral relationship
   */
  async create(data: {
    userId: string;
    sponsorId: string;
    level: number;
  }): Promise<Referral> {
    return prisma.referral.create({
      data: {
        userId: data.userId,
        sponsorId: data.sponsorId,
        level: data.level,
      },
      include: {
        user: true,
        sponsor: true,
      },
    });
  }

  /**
   * Find referral by user ID (referred user)
   */
  async findByUserId(userId: string): Promise<Referral | null> {
    return prisma.referral.findUnique({
      where: { userId },
      include: {
        user: true,
        sponsor: true,
      },
    });
  }

  /**
   * Find referral by referral code (referralCode is on User table)
   */
  async findByReferralCode(referralCode: string): Promise<Referral | null> {
    const user = await prisma.user.findUnique({
      where: { referralCode },
    });
    if (!user) return null;
    return this.findByUserId(user.id);
  }

  /**
   * Find referrals by sponsor ID (direct referrals)
   */
  async findBySponsorId(sponsorId: string): Promise<Referral[]> {
    return prisma.referral.findMany({
      where: { sponsorId },
      include: {
        user: true,
        sponsor: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find all referrals by sponsor ID (including nested)
   */
  async findAllBySponsorId(sponsorId: string, maxLevel: number = 5): Promise<Referral[]> {
    const referrals: Referral[] = [];
    const queue = [{ userId: sponsorId, currentLevel: 0 }];

    while (queue.length > 0) {
      const { userId, currentLevel } = queue.shift()!;

      if (currentLevel >= maxLevel) continue;

      const directReferrals = await this.findBySponsorId(userId);
      referrals.push(...directReferrals);

      for (const referral of directReferrals) {
        queue.push({ userId: referral.userId, currentLevel: currentLevel + 1 });
      }
    }

    return referrals;
  }

  /**
   * Create referral bonus
   */
  async createBonus(data: {
    referralId: string;
    userId: string;
    depositId: string;
    depositAmount: number;
    bonusPercentage: number;
    bonusAmount: number;
    level: number;
    status: DepositStatus;
  }): Promise<ReferralBonus> {
    return prisma.referralBonus.create({
      data: {
        referralId: data.referralId,
        userId: data.userId,
        depositId: data.depositId,
        depositAmount: data.depositAmount,
        bonusPercentage: data.bonusPercentage,
        bonusAmount: data.bonusAmount,
        level: data.level,
        status: data.status,
      },
      include: {
        user: true,
        referral: {
          include: {
            user: true,
            sponsor: true,
          },
        },
        deposit: true,
      },
    });
  }

  /**
   * Find referral bonus by ID
   */
  async findBonusById(id: string): Promise<ReferralBonus | null> {
    return prisma.referralBonus.findUnique({
      where: { id },
      include: {
        user: true,
        referral: {
          include: {
            user: true,
            sponsor: true,
          },
        },
        deposit: true,
      },
    });
  }

  /**
   * Find referral bonuses by user ID (earned bonuses)
   */
  async findBonusesByUserId(
    userId: string,
    options: {
      level?: number;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ bonuses: ReferralBonus[]; total: number }> {
    const { level, page = 1, limit = 10 } = options;

    const where: any = { userId };
    if (level) where.level = level;

    const [bonuses, total] = await Promise.all([
      prisma.referralBonus.findMany({
        where,
        include: {
          user: true,
          referral: {
            include: {
              user: true,
              sponsor: true,
            },
          },
          deposit: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.referralBonus.count({ where }),
    ]);

    return { bonuses, total };
  }

  /**
   * Check if bonus already paid for deposit
   */
  async findBonusByDepositId(depositId: string): Promise<ReferralBonus | null> {
    return prisma.referralBonus.findFirst({
      where: { depositId },
    });
  }

  /**
   * Get referral statistics
   */
  async getStatistics(userId: string): Promise<{
    totalReferrals: number;
    directReferrals: number;
    totalBonuses: number;
    totalBonusAmount: number;
  }> {
    const [totalReferrals, directReferrals, totalBonuses, totalBonusAmount] = await Promise.all([
      prisma.referral.count({ where: { sponsorId: userId } }),
      prisma.referral.count({ where: { sponsorId: userId, level: 1 } }),
      prisma.referralBonus.count({ where: { userId } }),
      prisma.referralBonus.aggregate({
        where: { userId },
        _sum: { bonusAmount: true },
      }),
    ]);

    return {
      totalReferrals,
      directReferrals,
      totalBonuses,
      totalBonusAmount: Number(totalBonusAmount._sum.bonusAmount || 0),
    };
  }

  /**
   * Get referral tree
   *
   * Returns a nested tree of referrals up to `maxLevel` deep. Each node
   * includes the user's name and email so the frontend can render a
   * human-readable tree instead of truncated UUIDs.
   */
  async getReferralTree(userId: string, maxLevel: number = 5): Promise<any> {
    // Fetch the root user's profile once — the recursive builder only has
    // access to the *referred* user via referral.user, not the sponsor.
    const rootUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    const buildTree = async (currentUserId: string, currentLevel: number, name: string | null, email: string | null): Promise<any> => {
      if (currentLevel >= maxLevel) {
        return {
          userId: currentUserId,
          name,
          email,
          level: currentLevel,
          directReferrals: 0,
          children: [],
        };
      }

      // Fetch direct referrals with the referred user's profile so we can
      // pass name/email into each child node without an extra query per child.
      const referrals = await prisma.referral.findMany({
        where: { sponsorId: currentUserId },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const children = await Promise.all(
        referrals.map((referral) =>
          buildTree(referral.userId, currentLevel + 1, referral.user?.name ?? null, referral.user?.email ?? null),
        ),
      );

      return {
        userId: currentUserId,
        name,
        email,
        level: currentLevel,
        directReferrals: referrals.length,
        children,
      };
    };

    return buildTree(userId, 0, rootUser?.name ?? null, rootUser?.email ?? null);
  }
}

export const referralRepository = new ReferralRepository();
export default referralRepository;
