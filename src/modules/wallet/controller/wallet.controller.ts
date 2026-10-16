import { Request, Response, NextFunction } from 'express';
import { walletService } from '../service/wallet.service';

export class WalletController {
  /**
   * Get wallet summary
   */
  async getWalletSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const summary = await walletService.getWalletSummary(userId);
      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get specific wallet
   */
  async getWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const type = req.params.type as any;
      const wallet = await walletService.getWallet(userId, type);
      res.status(200).json({
        success: true,
        data: wallet,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const type = req.params.type as any;
      const balance = await walletService.getBalance(userId, type);
      res.status(200).json({
        success: true,
        data: { balance: balance.toString() },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Move balance from a bonus wallet into PRINCIPAL (compounds the stake,
   * restarts the trade-count baseline for the early-exit penalty)
   */
  async transferToPrincipal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const result = await walletService.transferToPrincipal(
        userId,
        req.body.sourceWallet,
        req.body.amount,
      );
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const walletController = new WalletController();
