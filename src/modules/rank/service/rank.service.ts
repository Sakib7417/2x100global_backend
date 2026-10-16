import { rankRepository } from '../repository/rank.repository';
import { walletRepository } from '../../wallet/repository/wallet.repository';
import {
  RANK_DEFINITIONS,
  RANK_ORDER,
  RankTier,
  MIN_SELF_PRINCIPAL_FOR_RANK,
} from '../constants/rank.constants';
import { EligibilityInfo, RankNetworkNode } from '../types/rank.types';
import { NotFoundError } from '../../../utils/errors';
import { walletService } from '../../wallet/service/wallet.service';
import { ledgerService } from '../../ledger/service/ledger.service';
import prisma from '../../../config/database';
import { RankLevel, WalletType, LedgerType, ReferenceType } from '@prisma/client';

/** Position of a rank in the progression ladder. NONE sits below LV1. */
const rankIndex = (rank: RankLevel): number =>
  rank === RankLevel.NONE ? -1 : RANK_ORDER.indexOf(rank as RankTier);

const EMPTY_INFO: EligibilityInfo = {
  eligible: false,
  teamSize: 0,
  qualifyingDirects: 0,
  descEligible: new Array(RANK_ORDER.length).fill(0),
};

export class RankService {
  /**
   * Does a node's computed stats satisfy the requirements of `level`?
   * `descEligible` already contains only still-eligible members.
   */
  private meetsRequirements(level: RankTier, info: EligibilityInfo): boolean {
    const def = RANK_DEFINITIONS[level];
    if (level === RankLevel.LV1) {
      return info.qualifyingDirects >= def.qualifyingDirects;
    }
    if (info.descEligible[0] < def.lv1AchieverCount) return false;
    if (
      def.higherAchieverRank &&
      info.descEligible[rankIndex(def.higherAchieverRank)] <
        (def.higherAchieverCount ?? 0)
    ) {
      return false;
    }
    return info.teamSize >= def.teamSize;
  }

  /**
   * Compute live eligibility for a node set (one referral subtree or the
   * whole network) bottom-up.
   *
   * A user is `eligible` when they hold a rank AND keep their own
   * PRINCIPAL stake (>= MIN_SELF_PRINCIPAL_FOR_RANK) AND their rank's
   * requirements are still met — where achiever counts include only
   * members who are themselves eligible. A qualifying direct keeps
   * counting only while both their approved deposits and their current
   * principal stay >= the minimum. So a member who withdraws their
   * principal stops counting, which cascades upward and makes every
   * upline who depended on them ineligible until the stake is restored.
   */
  private buildEligibilityMap(
    nodes: RankNetworkNode[],
    depositSums: Map<string, number>,
  ): Map<string, EligibilityInfo> {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const children = new Map<string, string[]>();
    for (const node of nodes) {
      if (node.sponsorId && byId.has(node.sponsorId)) {
        const list = children.get(node.sponsorId) ?? [];
        list.push(node.id);
        children.set(node.sponsorId, list);
      }
    }

    const result = new Map<string, EligibilityInfo>();
    const visiting = new Set<string>();

    const visit = (id: string): EligibilityInfo => {
      const cached = result.get(id);
      if (cached) return cached;
      if (visiting.has(id)) return EMPTY_INFO; // sponsor cycle guard
      visiting.add(id);

      const node = byId.get(id)!;
      let teamSize = 0;
      let qualifyingDirects = 0;
      const descEligible = new Array(RANK_ORDER.length).fill(0);

      for (const kidId of children.get(id) ?? []) {
        const kid = byId.get(kidId)!;
        const kidInfo = visit(kidId);
        teamSize += 1 + kidInfo.teamSize;
        const kidTier = rankIndex(kid.rank);
        for (let t = 0; t < RANK_ORDER.length; t++) {
          descEligible[t] +=
            kidInfo.descEligible[t] + (kidInfo.eligible && kidTier >= t ? 1 : 0);
        }
        if (
          (depositSums.get(kidId) ?? 0) >= RANK_DEFINITIONS.LV1.minDirectDeposit &&
          kid.principal >= MIN_SELF_PRINCIPAL_FOR_RANK
        ) {
          qualifyingDirects++;
        }
      }

      const info: EligibilityInfo = {
        eligible: false,
        teamSize,
        qualifyingDirects,
        descEligible,
      };
      const tierIdx = rankIndex(node.rank);
      if (
        tierIdx >= 0 &&
        node.principal >= MIN_SELF_PRINCIPAL_FOR_RANK &&
        this.meetsRequirements(RANK_ORDER[tierIdx], info)
      ) {
        info.eligible = true;
      }

      visiting.delete(id);
      result.set(id, info);
      return info;
    };

    for (const node of nodes) visit(node.id);
    return result;
  }

  /**
   * Live eligibility for the whole network — used by the cycle (salary)
   * bonus job so a user is paid only while their rank conditions hold.
   */
  async computeNetworkEligibility(): Promise<Map<string, EligibilityInfo>> {
    const nodes = await rankRepository.getAllUsersRankData();
    const depositSums = await rankRepository.getApprovedDepositSums(
      nodes.map((n) => n.id),
    );
    return this.buildEligibilityMap(nodes, depositSums);
  }

  /**
   * Evaluate rank for a user and trigger parent sponsor re-evaluations up the tree.
   *
   * Runs inside a transaction that row-locks the user (SELECT ... FOR UPDATE) so
   * concurrent evaluations serialize and cannot double-credit bonuses. When
   * multiple ranks are earned at once, every intermediate level's history entry
   * and achievement bonus is recorded — no bonus is skipped.
   */
  async evaluateUserRank(userId: string): Promise<RankLevel> {
    const { resultingRank, sponsorId, promoted } = await prisma.$transaction(async (tx) => {
      // Lock the user row for the duration of this evaluation
      const rows = await tx.$queryRaw<
        Array<{ id: string; rank: RankLevel; sponsor_id: string | null }>
      >`SELECT id, rank, sponsor_id FROM users WHERE id = ${userId} FOR UPDATE`;
      const user = rows[0];

      if (!user) {
        throw new NotFoundError('User not found');
      }

      const currentRank = user.rank;
      const currentIndex = rankIndex(currentRank);

      // Gather statistics inside the transaction for a consistent snapshot
      const [directReferralCount, downline, principalWallet] = await Promise.all([
        tx.user.count({ where: { sponsorId: userId } }),
        rankRepository.getDownlineDetails(userId, tx),
        walletRepository.findByUserIdAndType(userId, WalletType.PRINCIPAL, tx),
      ]);

      const selfPrincipal = principalWallet ? Number(principalWallet.balance) : 0;

      // Live eligibility over the user's subtree: members count toward
      // achiever thresholds only while they keep their own principal stake
      // and rank conditions — a member who withdrew stops counting here.
      const nodes: RankNetworkNode[] = [
        { id: userId, sponsorId: null, rank: user.rank, principal: selfPrincipal },
        ...downline,
      ];
      const depositSums = await rankRepository.getApprovedDepositSums(
        nodes.map((n) => n.id),
        tx,
      );
      const eligibility = this.buildEligibilityMap(nodes, depositSums);
      const selfInfo = eligibility.get(userId) ?? EMPTY_INFO;

      const teamSize = selfInfo.teamSize;
      const lv1Achievers = selfInfo.descEligible[0];

      // Self-activation gate: every rank requires the user's own PRINCIPAL
      // wallet balance to be at least MIN_SELF_PRINCIPAL_FOR_RANK
      const meetsSelfPrincipal = selfPrincipal >= MIN_SELF_PRINCIPAL_FOR_RANK;

      // Highest eligible tier wins — stays at current rank (incl. NONE) otherwise
      let targetIndex = currentIndex;
      if (meetsSelfPrincipal) {
        for (let i = RANK_ORDER.length - 1; i >= 0; i--) {
          if (this.meetsRequirements(RANK_ORDER[i], selfInfo)) {
            targetIndex = i;
            break;
          }
        }
      }

      // Rule: never downgrade
      if (targetIndex <= currentIndex) {
        return { resultingRank: currentRank, sponsorId: user.sponsor_id, promoted: false };
      }

      // Promote through every intermediate level so no achievement bonus or
      // history entry is skipped on a multi-level jump (e.g. NONE -> LV3)
      let previousLevel = currentRank;
      for (const level of RANK_ORDER.slice(currentIndex + 1, targetIndex + 1)) {
        const def = RANK_DEFINITIONS[level];

        await tx.user.update({
          where: { id: userId },
          data: { rank: level },
        });

        await rankRepository.upsertUserRank(
          {
            userId,
            level,
            directReferrals: directReferralCount,
            teamSize,
            lv1AchieverCount: lv1Achievers,
            achievedAt: new Date(),
            rankBonusEarned: def.rankBonus,
          },
          tx,
        );

        await rankRepository.createRankHistory(
          {
            userId,
            previousLevel,
            newLevel: level,
            changeReason: `Upgraded to ${level}`,
          },
          tx,
        );

        if (def.rankBonus > 0) {
          const creditResult = await walletService.creditWallet(
            userId,
            WalletType.RANK_BONUS,
            def.rankBonus,
            tx,
          );
          await ledgerService.createEntry(
            {
              userId,
              walletId: creditResult.wallet.id,
              type: LedgerType.RANK_BONUS,
              credit: def.rankBonus,
              debit: 0,
              beforeBalance: creditResult.beforeBalance,
              afterBalance: creditResult.afterBalance,
              description: `Rank Bonus achieved for ${level}`,
              referenceType: ReferenceType.RANK,
            },
            tx,
          );
        }

        previousLevel = level;
      }

      return {
        resultingRank: RANK_ORDER[targetIndex] as RankLevel,
        sponsorId: user.sponsor_id,
        promoted: true,
      };
    });

    // Re-evaluate sponsor up the chain after this transaction commits —
    // only when this user's rank actually changed
    if (sponsorId && promoted) {
      this.evaluateUserRank(sponsorId).catch((err) => {
        console.error(`Error re-evaluating sponsor ${sponsorId}:`, err);
      });
    }

    return resultingRank;
  }

  /**
   * Get rank info and history for a user
   */
  async getUserRankInfo(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const rankRecord = await rankRepository.findByUserId(userId);
    const history = await rankRepository.findHistoryByUserId(userId);

    // Live progress stats so clients can show "how much is left" per tier.
    // Achiever counts include only members who still satisfy their own
    // rank conditions (principal stake + requirements) — matching what
    // the cycle bonus gate will check.
    const [directReferralCount, downline, principalWallet] = await Promise.all([
      prisma.user.count({ where: { sponsorId: userId } }),
      rankRepository.getDownlineDetails(userId),
      walletRepository.findByUserIdAndType(userId, WalletType.PRINCIPAL),
    ]);

    const selfPrincipal = principalWallet ? Number(principalWallet.balance) : 0;
    const nodes: RankNetworkNode[] = [
      { id: userId, sponsorId: null, rank: user.rank, principal: selfPrincipal },
      ...downline,
    ];
    const depositSums = await rankRepository.getApprovedDepositSums(
      nodes.map((n) => n.id),
    );
    const selfInfo =
      this.buildEligibilityMap(nodes, depositSums).get(userId) ?? EMPTY_INFO;

    const achieversByLevel = Object.fromEntries(
      RANK_ORDER.map((tier, idx) => [tier, selfInfo.descEligible[idx]]),
    ) as Record<RankTier, number>;

    return {
      currentRank: user.rank,
      stats: {
        directReferrals: directReferralCount,
        qualifyingDirects: selfInfo.qualifyingDirects,
        teamSize: selfInfo.teamSize,
        achieversByLevel,
        selfPrincipal,
        eligible: selfInfo.eligible,
      },
      minSelfPrincipal: MIN_SELF_PRINCIPAL_FOR_RANK,
      requirements: RANK_ORDER.map((level) => RANK_DEFINITIONS[level]),
      cycleDurationDays: parseInt(process.env.CYCLE_DURATION_DAYS || '10'),
      rankDetails: rankRecord,
      history,
    };
  }
}

export const rankService = new RankService();
export default rankService;
