import { cycleBonusRepository } from '../repository/cycleBonus.repository';
import { rankService } from '../../rank/service/rank.service';
import { RANK_DEFINITIONS } from '../../rank/constants/rank.constants';
import { NotFoundError } from '../../../utils/errors';
import { walletService } from '../../wallet/service/wallet.service';
import { ledgerService } from '../../ledger/service/ledger.service';
import prisma from '../../../config/database';
import { CycleBonusStatus, WalletType, LedgerType, ReferenceType, RankLevel } from '@prisma/client';

export class CycleBonusService {
  /**
   * Process the cycle (salary) bonus for all eligible users.
   * Triggered every CYCLE_DURATION_DAYS days by cron / admin.
   */
  async process10DayCycleBonus() {
    // Find all users who have achieved a rank
    const ranks = await prisma.rank.findMany({
      include: { user: true },
    });

    // Live eligibility for the whole network — holding a rank is not
    // enough for the salary: every rank condition must still hold right
    // now (own principal stake, qualifying directs, achiever counts with
    // still-eligible members). Anyone who withdrew their stake — or whose
    // downline did — is skipped until the conditions hold again.
    const eligibility = await rankService.computeNetworkEligibility();

    const now = new Date();
    const cycleDays = parseInt(process.env.CYCLE_DURATION_DAYS || '10');
    const processedResults = [];
    const skipped: string[] = [];

    for (const userRank of ranks) {
      try {
        if (userRank.level === RankLevel.NONE) continue;
        const levelDef = RANK_DEFINITIONS[userRank.level];
        if (!levelDef || levelDef.cycleBonus <= 0) continue;

        const info = eligibility.get(userRank.userId);
        if (!info?.eligible) {
          skipped.push(userRank.userId);
          continue;
        }

        // Determine cycle number
        const latestCycle = await cycleBonusRepository.findLatestByUserId(userRank.userId);
        const nextCycleNumber = latestCycle ? latestCycle.cycleNumber + 1 : 1;

        const cycleStartDate = latestCycle ? latestCycle.cycleEndDate : new Date(now.getTime() - cycleDays * 24 * 60 * 60 * 1000);
        const cycleEndDate = now;

        const bonusAmount = levelDef.cycleBonus;

        // Create CycleBonus record
        const cycleBonusRecord = await cycleBonusRepository.create({
          userId: userRank.userId,
          rankId: userRank.id,
          rankLevel: userRank.level,
          cycleNumber: nextCycleNumber,
          cycleStartDate,
          cycleEndDate,
          rankBonusAmount: Number(userRank.totalRankBonusEarned || 0),
          cycleBonusAmount: bonusAmount,
          totalAmount: bonusAmount,
          status: CycleBonusStatus.PENDING,
          eligibilityData: {
            rankLevel: userRank.level,
            teamSize: info.teamSize,
            qualifyingDirects: info.qualifyingDirects,
            lv1Achievers: info.descEligible[0],
          },
        });

        // Credit Cycle Bonus Wallet
        const walletResult = await walletService.creditWallet(
          userRank.userId,
          WalletType.POOL_BONUS,
          bonusAmount
        );

        // Create Ledger entry for Cycle Bonus
        await ledgerService.createEntry({
          userId: userRank.userId,
          walletId: walletResult.wallet.id,
          type: LedgerType.POOL_BONUS,
          credit: bonusAmount,
          debit: 0,
          beforeBalance: walletResult.beforeBalance,
          afterBalance: walletResult.afterBalance,
          description: `Salary Bonus for ${userRank.level} (Cycle #${nextCycleNumber})`,
          referenceId: cycleBonusRecord.id,
          referenceType: ReferenceType.CYCLE,
        });

        // Update rank totalCycleBonusEarned
        await prisma.rank.update({
          where: { id: userRank.id },
          data: {
            totalCycleBonusEarned: {
              increment: bonusAmount,
            },
          },
        });

        // Mark CycleBonus as CREDITED
        const updatedRecord = await cycleBonusRepository.markAsCredited(cycleBonusRecord.id);
        processedResults.push(updatedRecord);
      } catch (error) {
        console.error(`Failed to process cycle bonus for user ${userRank.userId}:`, error);
      }
    }

    return {
      processedCount: processedResults.length,
      skippedCount: skipped.length,
      skippedUserIds: skipped,
      bonuses: processedResults,
    };
  }

  /**
   * Get user's cycle bonus history
   */
  async getUserCycleBonuses(userId: string, options: { page?: number; limit?: number } = {}) {
    return cycleBonusRepository.findByUserId(userId, options);
  }

  /**
   * Get all cycle bonuses (Admin)
   */
  async getAllCycleBonuses(options: { page?: number; limit?: number } = {}) {
    return cycleBonusRepository.findAll(options);
  }

  /**
   * Get single cycle bonus by ID
   */
  async getById(id: string) {
    const record = await cycleBonusRepository.findById(id);
    if (!record) {
      throw new NotFoundError('Cycle bonus record not found');
    }
    return record;
  }
}

export const cycleBonusService = new CycleBonusService();
export default cycleBonusService;
