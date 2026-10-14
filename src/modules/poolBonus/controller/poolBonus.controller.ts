import { Request, Response, NextFunction } from 'express';
import { poolBonusService } from '../service/poolBonus.service';
import { CreatePoolBonusRequestInput, ApprovePoolBonusRequestInput, UpdatePoolBonusRequestInput, RejectPoolBonusRequestInput } from '../validator/poolBonus.validator';

export class PoolBonusController {
  // ===== User Endpoints =====

  async createRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const data: CreatePoolBonusRequestInput = req.body;
      const request = await poolBonusService.createRequest(userId, {
        requestType: data.requestType as any,
        requestedAmount: data.requestedAmount,
        destinationAddress: data.destinationAddress,
        network: data.network,
        withdrawPassword: data.withdrawPassword,
      });
      res.status(201).json({ success: true, message: 'Pool bonus request submitted successfully', data: request });
    } catch (error) {
      next(error);
    }
  }

  async getMyRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const result = await poolBonusService.getUserRequests(userId, req.query as any);
      res.status(200).json({ success: true, data: result.data, meta: { total: result.total, page: result.page, limit: result.limit } });
    } catch (error) {
      next(error);
    }
  }

  async getMyRequestById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const request = await poolBonusService.getRequestById(userId, req.params.id);
      res.status(200).json({ success: true, data: request });
    } catch (error) {
      next(error);
    }
  }

  async cancelRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const request = await poolBonusService.cancelRequest(userId, req.params.id);
      res.status(200).json({ success: true, message: 'Pool bonus request cancelled', data: request });
    } catch (error) {
      next(error);
    }
  }

  // ===== Admin Endpoints =====

  async getAllRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await poolBonusService.getAllRequests(req.query as any);
      res.status(200).json({ success: true, data: result.data, meta: { total: result.total, page: result.page, limit: result.limit } });
    } catch (error) {
      next(error);
    }
  }

  async getAdminRequestById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const request = await poolBonusService.getAdminRequestById(req.params.id);
      res.status(200).json({ success: true, data: request });
    } catch (error) {
      next(error);
    }
  }

  async approveRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = (req as any).user.userId;
      const data: ApprovePoolBonusRequestInput = req.body;
      const request = await poolBonusService.approveRequest(adminId, req.params.id, data);
      res.status(200).json({ success: true, message: 'Pool bonus request approved and processed', data: request });
    } catch (error) {
      next(error);
    }
  }

  async updateAndApproveRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = (req as any).user.userId;
      const data: UpdatePoolBonusRequestInput = req.body;
      const request = await poolBonusService.updateAndApproveRequest(adminId, req.params.id, data);
      res.status(200).json({ success: true, message: 'Pool bonus request amount updated and approved', data: request });
    } catch (error) {
      next(error);
    }
  }

  async rejectRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = (req as any).user.userId;
      const data: RejectPoolBonusRequestInput = req.body;
      const request = await poolBonusService.rejectRequest(adminId, req.params.id, data);
      res.status(200).json({ success: true, message: 'Pool bonus request rejected', data: request });
    } catch (error) {
      next(error);
    }
  }
}

export const poolBonusController = new PoolBonusController();
export default poolBonusController;
