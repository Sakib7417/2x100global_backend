import { Request, Response, NextFunction } from 'express';
import { withdrawalService } from '../service/withdrawal.service';
import { CreateWithdrawalInput } from '../validator/withdrawal.validator';
import { WithdrawalWalletType, WithdrawalStatus } from '@prisma/client';

export class WithdrawalController {
  /**
   * Create withdrawal request
   */
  async createWithdrawal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const data: CreateWithdrawalInput = req.body;
      
      const withdrawal = await withdrawalService.createWithdrawal(userId, {
        amount: data.amount.toString(),
        walletAddress: data.walletAddress,
        walletType: data.walletType as WithdrawalWalletType,
        withdrawPassword: data.withdrawPassword,
      });
      
      res.status(201).json({
        success: true,
        message: 'Withdrawal created successfully',
        data: withdrawal,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user withdrawals
   */
  async getUserWithdrawals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const { status, startDate, endDate, page, limit } = req.query as any;
      
      const query = {
        status: status as WithdrawalStatus,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
      };
      
      const result = await withdrawalService.getUserWithdrawals(userId, query);
      
      res.status(200).json({
        success: true,
        data: result.withdrawals,
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
   * Get withdrawal by ID
   */
  async getWithdrawalById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;
      const withdrawal = await withdrawalService.getWithdrawalById(id);
      
      res.status(200).json({
        success: true,
        data: withdrawal,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get withdrawal statistics
   */
  async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const statistics = await withdrawalService.getStatistics(userId);
      
      res.status(200).json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process withdrawal (admin)
   */
  async processWithdrawal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;
      const adminId = (req as any).user.userId;
      const { transactionHash } = req.body;
      
      const withdrawal = await withdrawalService.processWithdrawal(id, transactionHash, adminId);
      
      res.status(200).json({
        success: true,
        message: 'Withdrawal processed successfully',
        data: withdrawal,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reject withdrawal (admin)
   */
  async rejectWithdrawal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;
      const adminId = (req as any).user.userId;
      const { rejectionReason } = req.body;
      
      const withdrawal = await withdrawalService.rejectWithdrawal(id, rejectionReason || 'Rejected by admin', adminId);
      
      res.status(200).json({
        success: true,
        message: 'Withdrawal rejected successfully',
        data: withdrawal,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all withdrawals (admin)
   */
  async getAllWithdrawals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, startDate, endDate, page, limit } = req.query as any;
      
      const query = {
        status: status as WithdrawalStatus,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
      };
      
      const result = await withdrawalService.getAllWithdrawals(query);
      
      res.status(200).json({
        success: true,
        data: result.withdrawals,
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

export const withdrawalController = new WithdrawalController();
