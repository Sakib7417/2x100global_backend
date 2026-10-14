import { z } from 'zod';

/**
 * Ticket create/reply schemas.
 *
 * Both accept `multipart/form-data` with optional `attachments` files.
 * The `message` field is required — a ticket message should always have text,
 * even when images are attached. Multer parses files before the validator runs,
 * so `req.body` contains the text fields as strings by the time Zod sees them.
 */
export const createTicketSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200),
  message: z.string().min(1, 'Message is required').max(5000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
});

export const replyTicketSchema = z.object({
  message: z.string().min(1, 'Message is required').max(5000),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type ReplyTicketInput = z.infer<typeof replyTicketSchema>;
