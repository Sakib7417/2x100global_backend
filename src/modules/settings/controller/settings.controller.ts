import { Request, Response, NextFunction } from 'express';
import { settingsService } from '../service/settings.service';
import { CreateSettingInput, UpdateSettingInput } from '../validator/settings.validator';

export class SettingsController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await settingsService.getAll();
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getByKey(req: Request, res: Response, next: NextFunction) {
    try {
      const { key } = req.params;
      const result = await settingsService.getByKey(key);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user.userId;
      const data: CreateSettingInput = req.body;
      const result = await settingsService.create(data, adminId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user.userId;
      const { key } = req.params;
      const data: UpdateSettingInput = req.body;
      const result = await settingsService.update(key, data, adminId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async seed(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user.userId;
      const result = await settingsService.seedDefaults(adminId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const settingsController = new SettingsController();
