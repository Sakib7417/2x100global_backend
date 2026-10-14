import { Request, Response, NextFunction } from 'express';
import { adminService } from '../service/admin.service';
import { UserActionDTO, UpdateConfigDTO } from '../dto/admin.dto';
import { listQuerySchema, UpdateTradeScheduleInput, ToggleTradingInput, AddTradeExclusionInput } from '../validator/admin.validator';

export class AdminController {
  async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.getDashboardStats();
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.getAnalytics();
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listUsers(listQuerySchema.parse(req.query));
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getUserDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const result = await adminService.getUserDetail(userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async listDeposits(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listDeposits(listQuerySchema.parse(req.query));
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async listWithdrawals(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listWithdrawals(listQuerySchema.parse(req.query));
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async listTrades(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listTrades(listQuerySchema.parse(req.query));
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async listWallets(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listWallets(listQuerySchema.parse(req.query));
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async listReferrals(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listReferrals(listQuerySchema.parse(req.query));
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async listRanks(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listRanks(listQuerySchema.parse(req.query));
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async listCycleBonuses(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listCycleBonuses(listQuerySchema.parse(req.query));
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async listBlockchainTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listBlockchainTransactions(listQuerySchema.parse(req.query));
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async listNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listNotifications(listQuerySchema.parse(req.query));
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async listAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listAuditLogs(listQuerySchema.parse(req.query));
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async listSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listSettings(listQuerySchema.parse(req.query));
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async manageUser(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user.userId;
      const data: UserActionDTO = req.body;
      const result = await adminService.manageUser(adminId, data);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user.userId;
      const data: UpdateConfigDTO = req.body;
      const result = await adminService.updateConfig(adminId, data);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getTradeSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.getTradeSchedule();
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateTradeSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user.userId;
      const data: UpdateTradeScheduleInput = req.body;
      const result = await adminService.updateTradeSchedule(adminId, data.morning, data.evening);
      res.status(200).json({ success: true, message: 'Trade schedule updated', data: result });
    } catch (error) {
      next(error);
    }
  }

  async getTradingStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.getTradingStatus();
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async toggleTrading(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user.userId;
      const data: ToggleTradingInput = req.body;
      const result = await adminService.toggleTrading(adminId, data.enabled);
      res.status(200).json({ success: true, message: `Trading ${result.enabled ? 'enabled' : 'disabled'}`, data: result });
    } catch (error) {
      next(error);
    }
  }

  async listTradeExclusions(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listTradeExclusions(listQuerySchema.parse(req.query));
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async addTradeExclusion(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user.userId;
      const data: AddTradeExclusionInput = req.body;
      const result = await adminService.addTradeExclusion(adminId, data);
      res.status(200).json({ success: true, message: 'User excluded from trading', data: result });
    } catch (error) {
      next(error);
    }
  }

  async removeTradeExclusion(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const result = await adminService.removeTradeExclusion(userId);
      res.status(200).json({ success: true, message: 'User removed from trading exclusion', data: result });
    } catch (error) {
      next(error);
    }
  }

  async toggleContentCreator(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { isContentCreator } = req.body;
      const result = await adminService.toggleContentCreator(userId, Boolean(isContentCreator));
      res.status(200).json({ success: true, message: `Content creator ${isContentCreator ? 'granted' : 'revoked'}`, data: result });
    } catch (error) {
      next(error);
    }
  }

  async listContentCreators(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listContentCreators();
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
