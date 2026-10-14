import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { ticketController } from '../controller/ticket.controller';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';
import { validateRequest } from '../../../middlewares/validation.middleware';
import { createTicketSchema, replyTicketSchema } from '../validator/ticket.validator';
import { TICKET_MAX_FILE_SIZE, TICKET_MAX_ATTACHMENTS } from '../constants/ticket.constants';

const router = Router();

// Multer config for ticket attachment uploads.
// Files are kept in memory and uploaded directly to Cloudinary by the
// controller — nothing is written to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TICKET_MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'));
  },
});

// ===== User endpoints =====

/**
 * @route   POST /api/v1/tickets
 * @desc    Create a new support ticket (with optional attachment images)
 * @access  Authenticated
 */
router.post('/', authenticate, upload.array('attachments', TICKET_MAX_ATTACHMENTS), validateRequest(createTicketSchema), ticketController.createTicket.bind(ticketController));

/**
 * @route   GET /api/v1/tickets
 * @desc    Get user's own tickets
 * @access  Authenticated
 */
router.get('/', authenticate, ticketController.getMyTickets.bind(ticketController));

/**
 * @route   GET /api/v1/tickets/:id
 * @desc    Get a specific ticket with messages
 * @access  Authenticated (owner only)
 */
router.get('/:id', authenticate, ticketController.getMyTicket.bind(ticketController));

/**
 * @route   POST /api/v1/tickets/:id/reply
 * @desc    Reply to a ticket (user) with optional attachment images
 * @access  Authenticated (owner only)
 */
router.post('/:id/reply', authenticate, upload.array('attachments', TICKET_MAX_ATTACHMENTS), validateRequest(replyTicketSchema), ticketController.replyToMyTicket.bind(ticketController));

// ===== Admin endpoints =====

/**
 * @route   GET /api/v1/tickets/admin/all
 * @desc    Get all tickets (admin)
 * @access  Admin
 */
router.get('/admin/all', authenticate, authorize('ADMIN'), ticketController.getAllTickets.bind(ticketController));

/**
 * @route   GET /api/v1/tickets/admin/:id
 * @desc    Get any ticket with messages (admin)
 * @access  Admin
 */
router.get('/admin/:id', authenticate, authorize('ADMIN'), ticketController.getTicket.bind(ticketController));

/**
 * @route   POST /api/v1/tickets/admin/:id/reply
 * @desc    Reply to a ticket (admin) with optional attachment images
 * @access  Admin
 */
router.post('/admin/:id/reply', authenticate, authorize('ADMIN'), upload.array('attachments', TICKET_MAX_ATTACHMENTS), validateRequest(replyTicketSchema), ticketController.adminReply.bind(ticketController));

/**
 * @route   PUT /api/v1/tickets/admin/:id/close
 * @desc    Close a ticket (admin)
 * @access  Admin
 */
router.put('/admin/:id/close', authenticate, authorize('ADMIN'), ticketController.closeTicket.bind(ticketController));

/**
 * @route   PUT /api/v1/tickets/admin/:id/reopen
 * @desc    Reopen a ticket (admin)
 * @access  Admin
 */
router.put('/admin/:id/reopen', authenticate, authorize('ADMIN'), ticketController.reopenTicket.bind(ticketController));

export default router;
