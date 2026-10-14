import { Request, Response, NextFunction } from 'express';
import { userService } from '../service/user.service';
import { UpdateProfileInput, SetWithdrawPasswordInput } from '../validator/user.validator';
import { UserListQueryDTO } from '../dto/user.dto';

export class UserController {
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const result = await userService.getProfile(userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const data: UpdateProfileInput = req.body;
      const result = await userService.updateProfile(userId, data);
      res.status(200).json({ success: true, message: 'Profile updated', data: result });
    } catch (error) {
      next(error);
    }
  }

  async setWithdrawPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const data: SetWithdrawPasswordInput = req.body;
      const result = await userService.setWithdrawPassword(userId, data.withdrawPassword);
      res.status(200).json({
        success: true,
        message:
          'Withdraw password updated. Withdrawals are locked for the next 24 hours.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async toggleAutoTrade(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const result = await userService.toggleAutoTrade(userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const result = await userService.getDashboard(userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const query: UserListQueryDTO = req.query as any;
      const result = await userService.listUsers(query, userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
