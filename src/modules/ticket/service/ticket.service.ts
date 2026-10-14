import { ticketRepository } from '../repository/ticket.repository';
import { TICKET_ERRORS } from '../constants/ticket.constants';
import { CreateTicketDTO, ReplyTicketDTO, TicketQueryDTO } from '../types/ticket.types';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../../utils/errors';

export class TicketService {
  async createTicket(userId: string, data: CreateTicketDTO, attachments?: string[] | null) {
    return ticketRepository.create({
      userId,
      subject: data.subject,
      priority: data.priority,
      message: data.message,
      attachments,
    });
  }

  async getUserTickets(userId: string, query: TicketQueryDTO) {
    return ticketRepository.findByUserId(userId, {
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 20,
      status: query.status,
    });
  }

  async getTicketById(userId: string, ticketId: string, isAdmin = false) {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) throw new NotFoundError(TICKET_ERRORS.TICKET_NOT_FOUND);
    if (!isAdmin && ticket.userId !== userId) throw new ForbiddenError(TICKET_ERRORS.UNAUTHORIZED);
    return ticket;
  }

  async replyToTicket(userId: string, ticketId: string, data: ReplyTicketDTO, isAdmin = false, attachments?: string[] | null) {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) throw new NotFoundError(TICKET_ERRORS.TICKET_NOT_FOUND);
    if (!isAdmin && ticket.userId !== userId) throw new ForbiddenError(TICKET_ERRORS.UNAUTHORIZED);
    if (ticket.status === 'CLOSED') throw new BadRequestError(TICKET_ERRORS.TICKET_CLOSED);

    return ticketRepository.addMessage({
      ticketId,
      senderId: userId,
      isAdmin,
      message: data.message,
      attachments,
    });
  }

  async closeTicket(ticketId: string, adminId?: string) {
    return ticketRepository.updateStatus(ticketId, 'CLOSED', adminId);
  }

  async reopenTicket(ticketId: string) {
    return ticketRepository.updateStatus(ticketId, 'OPEN');
  }

  async getAllTickets(query: TicketQueryDTO) {
    return ticketRepository.findAll({
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 20,
      status: query.status,
    });
  }
}

export const ticketService = new TicketService();
export default ticketService;
