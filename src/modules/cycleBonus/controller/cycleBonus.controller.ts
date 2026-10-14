import { Request, Response, NextFunction } from 'express';
import { cycleBonusService } from '../service/cycleBonus.service';

export class CycleBonusController {
  /**
   * Trigger 10-day cycle bonus distribution (Admin / Cron)
   */
  async processCycleBonus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await cycleBonusService.process10DayCycleBonus();
      
      res.status(200).json({
        success: true,
        message: '10-Day Cycle bonus process completed',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user's cycle bonus history
   */
  async getUserCycleBonuses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const { page, limit } = req.query as any;

      const result = await cycleBonusService.getUserCycleBonuses(userId, {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
      });

      res.status(200).json({
        success: true,
        data: result.cycleBonuses,
        meta: {
          page: page ? parseInt(page) : 1,
          limit: limit ? parseInt(limit) : 10,
          total: result.total,
          totalPages: Math.ceil(result.total / (limit ? parseInt(limit) : 10)),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single cycle bonus by ID
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;
      const record = await cycleBonusService.getById(id);

      res.status(200).json({
        success: true,
        data: record,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all cycle bonuses (Admin)
   */
  async getAllCycleBonuses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = req.query as any;

      const result = await cycleBonusService.getAllCycleBonuses({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
      });

      res.status(200).json({
        success: true,
        data: result.cycleBonuses,
        meta: {
          page: page ? parseInt(page) : 1,
          limit: limit ? parseInt(limit) : 10,
          total: result.total,
          totalPages: Math.ceil(result.total / (limit ? parseInt(limit) : 10)),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const cycleBonusController = new CycleBonusController();
export default cycleBonusController;
