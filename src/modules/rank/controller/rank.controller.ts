import { Request, Response, NextFunction } from 'express';
import { rankService } from '../service/rank.service';

export class RankController {
  /**
   * Get user rank details and history
   */
  async getCurrentRank(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const rankInfo = await rankService.getUserRankInfo(userId);

      res.status(200).json({
        success: true,
        data: rankInfo,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Evaluate rank for current user
   */
  async evaluateRank(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const newRank = await rankService.evaluateUserRank(userId);

      res.status(200).json({
        success: true,
        message: 'Rank evaluation complete',
        data: { currentRank: newRank },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const rankController = new RankController();
export default rankController;
