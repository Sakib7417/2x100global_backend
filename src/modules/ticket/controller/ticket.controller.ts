import { Request, Response, NextFunction } from 'express';
import { ticketService } from '../service/ticket.service';
import { AuthRequest } from '../../../middlewares/auth.middleware';
import { CreateTicketInput, ReplyTicketInput } from '../validator/ticket.validator';
import { uploadManyToR2, R2_BUCKETS } from '../../../config/storage';

/**
 * Upload attachment files to Cloudflare R2 and return their public URLs.
 * Returns `null` when no files were uploaded so the caller can skip storing
 * an empty array.
 */
async function buildAttachmentUrls(files: Express.Multer.File[] | undefined): Promise<string[] | null> {
  if (!files || files.length === 0) return null;
  return uploadManyToR2(files, R2_BUCKETS.TICKETS);
}

export class TicketController {
  // ===== User endpoints =====

  async createTicket(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CreateTicketInput = req.body;
      const attachments = await buildAttachmentUrls(req.files as Express.Multer.File[] | undefined);
      const ticket = await ticketService.createTicket(req.user!.userId, data, attachments);
      res.status(201).json({ success: true, message: 'Ticket created successfully', data: ticket });
    } catch (error) {
      next(error);
    }
  }

  async getMyTickets(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ticketService.getUserTickets(req.user!.userId, req.query as any);
      res.status(200).json({ success: true, data: result.data, meta: { total: result.total, page: result.page, limit: result.limit } });
    } catch (error) {
      next(error);
    }
  }

  async getMyTicket(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticket = await ticketService.getTicketById(req.user!.userId, req.params.id);
      res.status(200).json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  }

  async replyToMyTicket(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: ReplyTicketInput = req.body;
      const attachments = await buildAttachmentUrls(req.files as Express.Multer.File[] | undefined);
      const msg = await ticketService.replyToTicket(req.user!.userId, req.params.id, data, false, attachments);
      res.status(200).json({ success: true, message: 'Message sent', data: msg });
    } catch (error) {
      next(error);
    }
  }

  // ===== Admin endpoints =====

  async getAllTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ticketService.getAllTickets(req.query as any);
      res.status(200).json({ success: true, data: result.data, meta: { total: result.total, page: result.page, limit: result.limit } });
    } catch (error) {
      next(error);
    }
  }

  async getTicket(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticket = await ticketService.getTicketById(req.user!.userId, req.params.id, true);
      res.status(200).json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  }

  async adminReply(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: ReplyTicketInput = req.body;
      const attachments = await buildAttachmentUrls(req.files as Express.Multer.File[] | undefined);
      const msg = await ticketService.replyToTicket(req.user!.userId, req.params.id, data, true, attachments);
      res.status(200).json({ success: true, message: 'Reply sent', data: msg });
    } catch (error) {
      next(error);
    }
  }

  async closeTicket(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticket = await ticketService.closeTicket(req.params.id, req.user!.userId);
      res.status(200).json({ success: true, message: 'Ticket closed', data: ticket });
    } catch (error) {
      next(error);
    }
  }

  async reopenTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticket = await ticketService.reopenTicket(req.params.id);
      res.status(200).json({ success: true, message: 'Ticket reopened', data: ticket });
    } catch (error) {
      next(error);
    }
  }
}

export const ticketController = new TicketController();
export default ticketController;
