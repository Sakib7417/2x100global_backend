import { rankRepository } from '../repository/rank.repository';
import { RANK_DEFINITIONS, RANK_ORDER } from '../constants/rank.constants';
import { NotFoundError } from '../../../utils/errors';
import { walletService } from '../../wallet/service/wallet.service';
import { ledgerService } from '../../ledger/service/ledger.service';
import prisma from '../../../config/database';
import { RankLevel, WalletType, LedgerType, ReferenceType } from '@prisma/client';

export class RankService {
  /**
   * Evaluate rank for a user and trigger parent sponsor re-evaluations up the tree
   */
  async evaluateUserRank(userId: string): Promise<RankLevel> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const currentRank = user.rank;

    // Gather statistics
    const directReferralCount = await prisma.user.count({ where: { sponsorId: userId } });
    const qualifyingDirectCount = await rankRepository.countQualifyingDirectReferrals(userId, 300);
    const directLv1Count = await rankRepository.countDirectReferralsWithMinRank(userId, RankLevel.LV1);
    const teamSize = await rankRepository.countTeamSize(userId);

    // Evaluate target rank from LV7 down to LV1
    let targetRank: RankLevel = RankLevel.LV1;

    for (let i = RANK_ORDER.length - 1; i >= 0; i--) {
      const levelKey = RANK_ORDER[i];
      const def = RANK_DEFINITIONS[levelKey];

      let isEligible = false;
      if (levelKey === RankLevel.LV1) {
        isEligible = qualifyingDirectCount >= def.directReferralCount;
      } else {
        isEligible = directLv1Count >= def.directLv1Count && teamSize >= def.teamSize;
      }

      if (isEligible) {
        targetRank = levelKey;
        break;
      }
    }

    const currentIndex = RANK_ORDER.indexOf(currentRank);
    const targetIndex = RANK_ORDER.indexOf(targetRank);

    // Rule: Never downgrade rank
    if (targetIndex > currentIndex) {
      const newRank = targetRank;
      const rankBonus = RANK_DEFINITIONS[newRank].rankBonus;

      // 1. Update user model rank
      await prisma.user.update({
        where: { id: userId },
        data: { rank: newRank },
      });

      // 2. Upsert Rank record
      await rankRepository.upsertUserRank({
        userId,
        level: newRank,
        directReferrals: directReferralCount,
        teamSize,
        directLv1Count,
        achievedAt: new Date(),
        rankBonusEarned: rankBonus,
      });

      // 3. Create RankHistory record
      await rankRepository.createRankHistory({
        userId,
        previousLevel: currentRank,
        newLevel: newRank,
        changeReason: `Upgraded to ${newRank}`,
      });

      // 4. Credit Rank Bonus Wallet
      if (rankBonus > 0) {
        const creditResult = await walletService.creditWallet(userId, WalletType.RANK_BONUS, rankBonus);
        await ledgerService.createEntry({
          userId,
          walletId: creditResult.wallet.id,
          type: LedgerType.RANK_BONUS,
          credit: rankBonus,
          debit: 0,
          beforeBalance: creditResult.beforeBalance,
          afterBalance: creditResult.afterBalance,
          description: `Rank Bonus achieved for ${newRank}`,
          referenceType: ReferenceType.RANK,
        });
      }

      // Re-evaluate sponsor up the chain
      if (user.sponsorId) {
        this.evaluateUserRank(user.sponsorId).catch((err) => {
          console.error(`Error re-evaluating sponsor ${user.sponsorId}:`, err);
        });
      }

      return newRank;
    }

    return currentRank;
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

    return {
      currentRank: user.rank,
      rankDetails: rankRecord,
      history,
    };
  }
}

export const rankService = new RankService();
export default rankService;
