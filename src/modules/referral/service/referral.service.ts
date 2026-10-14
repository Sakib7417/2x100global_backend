import { referralRepository } from '../repository/referral.repository';
import { walletService } from '../../wallet/service/wallet.service';
import { ledgerService } from '../../ledger/service/ledger.service';
import { REFERRAL_ERRORS, REFERRAL_BONUS_TIERS } from '../constants/referral.constants';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../../utils/errors';
import { WalletType, LedgerType, DepositStatus, ReferenceType } from '@prisma/client';
import { authRepository } from '../../auth/repository/auth.repository';
import prisma from '../../../config/database';

export class ReferralService {
  /**
   * Validate referral code
   */
  async validateReferralCode(referralCode: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { referralCode },
    });
    if (!user) {
      throw new BadRequestError(REFERRAL_ERRORS.INVALID_REFERRAL_CODE);
    }

    return {
      valid: true,
      sponsorId: user.id,
      referralCode: user.referralCode,
    };
  }

  /**
   * Create referral relationship
   */
  async createReferral(userId: string, sponsorId: string): Promise<any> {
    // Check if user already has a referrer
    const existingReferral = await referralRepository.findByUserId(userId);
    if (existingReferral) {
      throw new ConflictError(REFERRAL_ERRORS.ALREADY_REFERRED);
    }

    // Check for self-referral
    if (userId === sponsorId) {
      throw new BadRequestError(REFERRAL_ERRORS.SELF_REFERRAL);
    }

    // Validate sponsor exists
    const sponsor = await authRepository.findById(sponsorId);
    if (!sponsor) {
      throw new BadRequestError(REFERRAL_ERRORS.INVALID_REFERRAL_CODE);
    }

    // Get sponsor's referral record to determine level
    let sponsorReferral = await referralRepository.findByUserId(sponsorId);
    if (!sponsorReferral) {
      // Create root referral record for sponsor if they don't have one
      sponsorReferral = await prisma.referral.create({
        data: {
          userId: sponsorId,
          sponsorId: null,
          level: 0,
        },
        include: {
          user: true,
          sponsor: true,
        },
      });
    }

    const level = sponsorReferral.level + 1;

    // Create user referral
    const referral = await referralRepository.create({
      userId,
      sponsorId,
      level,
    });

    // Update sponsor's direct referral count
    await prisma.referral.update({
      where: { userId: sponsorId },
      data: { directReferralCount: { increment: 1 } },
    });

    // Update sponsor and ancestors' team size
    let currentSponsorId: string | null = sponsorId;
    while (currentSponsorId) {
      const currentRef = await referralRepository.findByUserId(currentSponsorId);
      if (!currentRef) break;

      await prisma.referral.update({
        where: { userId: currentSponsorId },
        data: { teamSize: { increment: 1 } },
      });

      currentSponsorId = currentRef.sponsorId;
    }

    return referral;
  }

  /**
   * Process referral bonus on deposit
   */
  async processReferralBonus(userId: string, depositAmount: number, depositId: string): Promise<void> {
    // Get user's referral record
    const referral = await referralRepository.findByUserId(userId);
    if (!referral || !referral.sponsorId) {
      return; // User has no sponsor
    }

    const sponsorId = referral.sponsorId;

    // Check if bonus already paid for this deposit
    const existingBonus = await referralRepository.findBonusByDepositId(depositId);
    if (existingBonus) {
      throw new ConflictError(REFERRAL_ERRORS.BONUS_ALREADY_PAID);
    }

    // Calculate percentage and bonus amount based on deposit size
    // 50-999 USDT -> 5% Sponsor Bonus
    // 1000-9999 USDT -> 10% Sponsor Bonus
    let percentage = 0;
    if (depositAmount >= REFERRAL_BONUS_TIERS.TIER_2_MIN) {
      percentage = REFERRAL_BONUS_TIERS.TIER_2_PERCENT;
    } else if (depositAmount >= REFERRAL_BONUS_TIERS.TIER_1_MIN) {
      percentage = REFERRAL_BONUS_TIERS.TIER_1_PERCENT;
    }

    if (percentage === 0) return;

    const bonusAmount = depositAmount * percentage;

    // Credit sponsor's referral wallet
    const walletResult = await walletService.creditWallet(
      sponsorId,
      WalletType.REFERRAL,
      bonusAmount
    );

    // Create ledger entry for sponsor
    await ledgerService.createEntry({
      userId: sponsorId,
      walletId: walletResult.wallet.id,
      type: LedgerType.REFERRAL_BONUS,
      credit: bonusAmount,
      debit: 0,
      beforeBalance: walletResult.beforeBalance,
      afterBalance: walletResult.afterBalance,
      description: `Direct Referral bonus - ${percentage * 100}% on deposit of ${depositAmount} USDT`,
      referenceId: depositId,
      referenceType: ReferenceType.DEPOSIT,
    });

    // Create referral bonus record in DB
    await referralRepository.createBonus({
      referralId: referral.id,
      userId: sponsorId,
      depositId,
      depositAmount,
      bonusPercentage: percentage * 100,
      bonusAmount,
      level: 1,
      status: DepositStatus.APPROVED,
    });

    // Update sponsor stats
    await prisma.referral.update({
      where: { userId: sponsorId },
      data: {
        totalBonusEarned: { increment: bonusAmount },
        directDepositAmount: { increment: depositAmount },
      },
    });

    // Update team deposits for all ancestors
    let currentSponsorId: string | null = sponsorId;
    while (currentSponsorId) {
      const currentRef = await referralRepository.findByUserId(currentSponsorId);
      if (!currentRef) break;

      await prisma.referral.update({
        where: { userId: currentSponsorId },
        data: { teamDepositAmount: { increment: depositAmount } },
      });

      currentSponsorId = currentRef.sponsorId;
    }
  }

  /**
   * Get referral tree
   */
  async getReferralTree(userId: string, maxLevel: number = 5): Promise<any> {
    return referralRepository.getReferralTree(userId, maxLevel);
  }

  /**
   * Get user referrals
   */
  async getUserReferrals(userId: string): Promise<any[]> {
    return referralRepository.findBySponsorId(userId);
  }

  /**
   * Get referral bonuses for user
   */
  async getUserBonuses(
    userId: string,
    options: {
      level?: number;
      page?: number;
      limit?: number;
    } = {}
  ) {
    return referralRepository.findBonusesByUserId(userId, options);
  }

  /**
   * Get referral statistics
   */
  async getStatistics(userId: string) {
    return referralRepository.getStatistics(userId);
  }

  /**
   * Get referral link
   */
  async getReferralLink(userId: string): Promise<string> {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return `${process.env.FRONTEND_URL || 'https://example.com'}/ref/${user.referralCode}`;
  }
}

export const referralService = new ReferralService();
export default referralService;
