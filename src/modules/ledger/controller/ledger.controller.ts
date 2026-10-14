import { Request, Response, NextFunction } from 'express';
import { ledgerService } from '../service/ledger.service';
import { LedgerType } from '@prisma/client';

export class LedgerController {
  /**
   * Get user ledger entries
   */
  async getUserLedgers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const { type, walletId, referenceId, startDate, endDate, page, limit } = req.query as any;

      const query = {
        type: type as LedgerType,
        walletId: walletId as string,
        referenceId: referenceId as string,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
      };

      const result = await ledgerService.getUserLedgers(userId, query);

      res.status(200).json({
        success: true,
        data: result.ledgers,
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
   * Get wallet ledger entries
   */
  async getWalletLedgers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const walletId = req.params.walletId;
      const { type, page, limit } = req.query as any;

      const query = {
        type: type as LedgerType,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
      };

      const result = await ledgerService.getWalletLedgers(walletId, query);

      res.status(200).json({
        success: true,
        data: result.ledgers,
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
   * Get ledger by ID
   */
  async getLedgerById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;
      const ledger = await ledgerService.getLedgerById(id);

      res.status(200).json({
        success: true,
        data: ledger,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const ledgerController = new LedgerController();
export default ledgerController;
