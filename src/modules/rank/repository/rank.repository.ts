import { Prisma, Rank, RankHistory, RankLevel } from '@prisma/client';
import prisma from '../../../config/database';
import { RankNetworkNode } from '../types/rank.types';

type TxClient = Prisma.TransactionClient;

export class RankRepository {
  /**
   * Find rank record for user
   */
  async findByUserId(userId: string): Promise<Rank | null> {
    return prisma.rank.findUnique({
      where: { userId },
      include: { user: true },
    });
  }

  /**
   * Upsert user rank record
   */
  async upsertUserRank(
    data: {
      userId: string;
      level: RankLevel;
      directReferrals: number;
      teamSize: number;
      lv1AchieverCount: number;
      achievedAt: Date;
      rankBonusEarned?: number;
    },
    tx?: TxClient,
  ): Promise<Rank> {
    const client = tx ?? prisma;
    return client.rank.upsert({
      where: { userId: data.userId },
      create: {
        userId: data.userId,
        level: data.level,
        directReferrals: data.directReferrals,
        teamSize: data.teamSize,
        directLv1Count: data.lv1AchieverCount,
        achievedAt: data.achievedAt,
        totalRankBonusEarned: data.rankBonusEarned || 0,
      },
      update: {
        level: data.level,
        directReferrals: data.directReferrals,
        teamSize: data.teamSize,
        directLv1Count: data.lv1AchieverCount,
        ...(data.rankBonusEarned && {
          totalRankBonusEarned: {
            increment: data.rankBonusEarned,
          },
        }),
      },
      include: { user: true },
    });
  }

  /**
   * Record rank history
   */
  async createRankHistory(
    data: {
      userId: string;
      previousLevel?: RankLevel;
      newLevel: RankLevel;
      changeReason?: string;
    },
    tx?: TxClient,
  ): Promise<RankHistory> {
    const client = tx ?? prisma;
    return client.rankHistory.create({
      data: {
        userId: data.userId,
        previousLevel: data.previousLevel,
        newLevel: data.newLevel,
        changeReason: data.changeReason || 'Rank Qualification Evaluated',
        changedAt: new Date(),
      },
    });
  }

  /**
   * Find user's rank history
   */
  async findHistoryByUserId(userId: string): Promise<RankHistory[]> {
    return prisma.rankHistory.findMany({
      where: { userId },
      orderBy: { changedAt: 'desc' },
    });
  }

  /**
   * Count direct referrals with cumulative APPROVED deposits >= minAmount
   */
  async countQualifyingDirectReferrals(
    userId: string,
    minDeposit: number,
    tx?: TxClient,
  ): Promise<number> {
    const client = tx ?? prisma;
    const directReferrals = await client.user.findMany({
      where: { sponsorId: userId },
      select: { id: true },
    });

    if (directReferrals.length === 0) return 0;

    let count = 0;
    for (const ref of directReferrals) {
      const depositSum = await client.deposit.aggregate({
        where: {
          userId: ref.id,
          status: 'APPROVED',
        },
        _sum: { amount: true },
      });

      if (Number(depositSum._sum.amount || 0) >= minDeposit) {
        count++;
      }
    }

    return count;
  }

  /**
   * Fetch every member of the user's downline (all depths) in a single
   * recursive traversal. UNION dedupes rows so the same member can never be
   * counted twice and sponsor cycles cannot loop forever. The user
   * themselves is never included.
   */
  async getDownlineRanks(
    userId: string,
    tx?: TxClient,
  ): Promise<Array<{ id: string; rank: RankLevel }>> {
    const client = tx ?? prisma;
    return client.$queryRaw<Array<{ id: string; rank: RankLevel }>>`
      WITH RECURSIVE downline AS (
        SELECT u.id, u.rank
        FROM users u
        WHERE u.sponsor_id = ${userId} AND u.id <> ${userId}
        UNION
        SELECT u.id, u.rank
        FROM users u
        INNER JOIN downline d ON u.sponsor_id = d.id
        WHERE u.id <> ${userId}
      )
      SELECT id, rank FROM downline
    `;
  }

  /**
   * Fetch every member of the user's downline (all depths) together with
   * their sponsor link and current PRINCIPAL wallet balance. Needed for
   * live eligibility checks where a member only counts while their own
   * conditions still hold (e.g. principal stake not withdrawn).
   */
  async getDownlineDetails(
    userId: string,
    tx?: TxClient,
  ): Promise<RankNetworkNode[]> {
    const client = tx ?? prisma;
    return client.$queryRaw<RankNetworkNode[]>`
      WITH RECURSIVE downline AS (
        SELECT u.id, u.sponsor_id AS "sponsorId", u.rank
        FROM users u
        WHERE u.sponsor_id = ${userId} AND u.id <> ${userId}
        UNION
        SELECT u.id, u.sponsor_id AS "sponsorId", u.rank
        FROM users u
        INNER JOIN downline d ON u.sponsor_id = d.id
        WHERE u.id <> ${userId}
      )
      SELECT d.id, d."sponsorId", d.rank,
             COALESCE(w.balance, 0)::float AS principal
      FROM downline d
      LEFT JOIN wallets w ON w.user_id = d.id AND w.type = 'PRINCIPAL'
    `;
  }

  /**
   * Sum of APPROVED deposits per user for a batch of user ids. Pending /
   * rejected / failed deposits never count.
   */
  async getApprovedDepositSums(
    userIds: string[],
    tx?: TxClient,
  ): Promise<Map<string, number>> {
    if (userIds.length === 0) return new Map();
    const client = tx ?? prisma;
    const rows = await client.$queryRaw<
      Array<{ user_id: string; total: number }>
    >`
      SELECT d.user_id, COALESCE(SUM(d.amount), 0)::float AS total
      FROM deposits d
      WHERE d.user_id IN (${Prisma.join(userIds)}) AND d.status = 'APPROVED'
      GROUP BY d.user_id
    `;
    return new Map(rows.map((row) => [row.user_id, row.total]));
  }

  /**
   * Every user in the network with sponsor link, rank and PRINCIPAL
   * balance. Used by the cycle bonus job to compute live eligibility for
   * the whole tree in one pass.
   */
  async getAllUsersRankData(tx?: TxClient): Promise<RankNetworkNode[]> {
    const client = tx ?? prisma;
    return client.$queryRaw<RankNetworkNode[]>`
      SELECT u.id, u.sponsor_id AS "sponsorId", u.rank,
             COALESCE(w.balance, 0)::float AS principal
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id AND w.type = 'PRINCIPAL'
    `;
  }
}

export const rankRepository = new RankRepository();
export default rankRepository;
