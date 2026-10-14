import { Request, Response, NextFunction } from 'express';
import { tradingService } from '../service/trading.service';
import { TradeStatus, TradeType } from '@prisma/client';

export class TradingController {
  /**
   * Get the live trade session (code + remaining window) for the current user
   */
  async getActiveSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const result = await tradingService.getActiveSession(userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Submit the session code to place this window's trade. Settles instantly.
   */
  async submitTradeCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const { code } = req.body;
      const result = await tradingService.submitTradeCode(userId, code);

      res.status(200).json({
        success: true,
        message: 'Trade executed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Manually trigger auto-trade session (Admin / Cron)
   */
  async triggerTradeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tradeType = req.body.tradeType || TradeType.MORNING;
      const result = await tradingService.executeTradeSession(tradeType);
      
      res.status(200).json({
        success: true,
        message: 'Trade session opened successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Settle pending trades (Admin / Cron)
   */
  async settlePendingTrades(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await tradingService.settlePendingTrades();
      
      res.status(200).json({
        success: true,
        message: 'Pending trades settled successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user trade history
   */
  async getUserTrades(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const { status, tradeType, startDate, endDate, page, limit } = req.query as any;

      const query = {
        status: status as TradeStatus,
        tradeType: tradeType as TradeType,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
      };

      const result = await tradingService.getUserTrades(userId, query);

      res.status(200).json({
        success: true,
        data: result.trades,
        meta: {
          page: Number(query.page) || 1,
          limit: Number(query.limit) || 20,
          total: result.total,
          totalPages: Math.ceil(result.total / query.limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get trade by ID
   */
  async getTradeById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;
      const trade = await tradingService.getTradeById(id);

      res.status(200).json({
        success: true,
        data: trade,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get trade statistics
   */
  async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const statistics = await tradingService.getStatistics(userId);

      res.status(200).json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get recent completed trades for public activity feed.
   */
  async getRecentTrades(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const trades = await tradingService.getRecentTrades(limit);

      res.status(200).json({
        success: true,
        data: trades,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all trades (Admin)
   */
  async getAllTrades(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, tradeType, startDate, endDate, page, limit } = req.query as any;

      const query = {
        status: status as TradeStatus,
        tradeType: tradeType as TradeType,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
      };

      const result = await tradingService.getAllTrades(query);

      res.status(200).json({
        success: true,
        data: result.trades,
        meta: {
          page: Number(query.page) || 1,
          limit: Number(query.limit) || 20,
          total: result.total,
          totalPages: Math.ceil(result.total / query.limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const tradingController = new TradingController();
export default tradingController;
