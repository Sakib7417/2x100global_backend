import { Request, Response, NextFunction } from 'express';
import { depositService } from '../service/deposit.service';
import { CreateDepositInput } from '../validator/deposit.validator';
import { DepositStatus } from '@prisma/client';
import { ForbiddenError } from '../../../utils/errors';

export class DepositController {
  /**
   * Get the platform deposit wallet address (user-facing).
   *
   * Returned to the deposit form so the user knows exactly where to send
   * USDT. Sourced from the admin-managed setting with an env fallback.
   */
  async getDepositWalletAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const address = await depositService.getDepositWalletAddress();
      res.status(200).json({ success: true, data: { address } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create deposit
   */
  async createDeposit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const data: CreateDepositInput = req.body;
      
      const deposit = await depositService.createDeposit(userId, {
        amount: data.amount,
        transactionHash: data.transactionHash,
        senderAddress: data.senderAddress,
        receiverAddress: data.receiverAddress,
        tokenContract: data.tokenContract,
        network: data.network,
      });
      
      res.status(201).json({
        success: true,
        message: 'Deposit submitted successfully and sent for blockchain verification',
        data: deposit,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user deposits
   */
  async getUserDeposits(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const { status, startDate, endDate, page, limit } = req.query as any;

      const query = {
        status: status as DepositStatus,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
      };

      const result = await depositService.getUserDeposits(userId, query);

      res.status(200).json({
        success: true,
        data: result.deposits,
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
   * Get deposit by ID
   */
  async getDepositById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;
      const deposit = await depositService.getDepositById(id);

      res.status(200).json({
        success: true,
        data: deposit,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get deposit statistics
   */
  async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const statistics = await depositService.getStatistics(userId);

      res.status(200).json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve deposit (admin)
   */
  async approveDeposit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;
      const deposit = await depositService.approveDeposit(id);

      res.status(200).json({
        success: true,
        message: 'Deposit approved successfully',
        data: deposit,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reject deposit (admin)
   */
  async rejectDeposit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;
      const { rejectionReason } = req.body;

      const deposit = await depositService.rejectDeposit(id, rejectionReason);

      res.status(200).json({
        success: true,
        message: 'Deposit rejected successfully',
        data: deposit,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify deposit (owner or admin)
   */
  async verifyDeposit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;
      const user = (req as any).user;
      const { transactionHash } = req.body || {};
      const deposit = await depositService.getDepositById(id);

      if (deposit.userId !== user.userId && user.role !== 'ADMIN') {
        throw new ForbiddenError('You are not authorized to verify this deposit');
      }

      const result = await depositService.verifyDeposit(id, transactionHash);

      res.status(200).json({
        success: true,
        message: 'Deposit verified successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all deposits (admin)
   */
  async getAllDeposits(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, startDate, endDate, page, limit } = req.query as any;

      const query = {
        status: status as DepositStatus,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
      };

      const result = await depositService.getAllDeposits(query);

      res.status(200).json({
        success: true,
        data: result.deposits,
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

export const depositController = new DepositController();
export default depositController;
