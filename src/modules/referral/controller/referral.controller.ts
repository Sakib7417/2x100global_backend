import { Request, Response, NextFunction } from 'express';
import { referralService } from '../service/referral.service';
import { ValidateReferralCodeInput, GetReferralTreeInput, GetReferralBonusesInput } from '../validator/referral.validator';

export class ReferralController {
  /**
   * Validate referral code
   */
  async validateReferralCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: ValidateReferralCodeInput = req.body;
      const result = await referralService.validateReferralCode(data.referralCode);
      
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get referral tree
   */
  async getReferralTree(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const query: GetReferralTreeInput = req.query as any;
      
      const tree = await referralService.getReferralTree(userId, query.maxLevel);
      
      res.status(200).json({
        success: true,
        data: tree,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user referrals
   */
  async getUserReferrals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const referrals = await referralService.getUserReferrals(userId);
      
      res.status(200).json({
        success: true,
        data: referrals,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get referral bonuses
   */
  async getUserBonuses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const query: GetReferralBonusesInput = req.query as any;
      
      const result = await referralService.getUserBonuses(userId, query);
      
      res.status(200).json({
        success: true,
        data: result.bonuses,
        meta: {
          page: Number(query.page) || 1,
          limit: Number(query.limit) || 10,
          total: result.total,
          totalPages: Math.ceil(result.total / (query.limit || 10)),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get referral statistics
   */
  async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const statistics = await referralService.getStatistics(userId);
      
      res.status(200).json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get referral link
   */
  async getReferralLink(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const link = await referralService.getReferralLink(userId);
      
      res.status(200).json({
        success: true,
        data: { referralLink: link },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const referralController = new ReferralController();
