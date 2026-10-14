import prisma from '../../../config/database';

export class TicketRepository {
  async create(data: { userId: string; subject: string; priority?: string; message: string; attachments?: string[] | null }) {
    return prisma.ticket.create({
      data: {
        userId: data.userId,
        subject: data.subject,
        priority: (data.priority as any) || 'MEDIUM',
        messages: {
          create: {
            senderId: data.userId,
            isAdmin: false,
            message: data.message,
            attachments: data.attachments ?? undefined,
          },
        },
      },
      include: { messages: { orderBy: { createdAt: 'asc' } }, user: { select: { id: true, name: true, email: true } } },
    });
  }

  async findByUserId(userId: string, options: { page?: number; limit?: number; status?: string } = {}) {
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 20;
    const where: any = { userId };
    if (options.status) where.status = options.status;

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.ticket.count({ where }),
    ]);

    return { data: tickets, total, page, limit };
  }

  async findAll(options: { page?: number; limit?: number; status?: string } = {}) {
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 20;
    const where: any = {};
    if (options.status) where.status = options.status;

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.ticket.count({ where }),
    ]);

    return { data: tickets, total, page, limit };
  }

  async findById(id: string) {
    return prisma.ticket.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' }, include: { sender: { select: { id: true, name: true, email: true, role: true } } } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async addMessage(data: { ticketId: string; senderId: string; isAdmin: boolean; message: string; attachments?: string[] | null }) {
    const [msg] = await prisma.$transaction([
      prisma.ticketMessage.create({
        data: {
          ticketId: data.ticketId,
          senderId: data.senderId,
          isAdmin: data.isAdmin,
          message: data.message,
          attachments: data.attachments ?? undefined,
        },
      }),
      prisma.ticket.update({
        where: { id: data.ticketId },
        data: { status: data.isAdmin ? 'REPLIED' : 'OPEN' },
      }),
    ]);
    return msg;
  }

  async updateStatus(id: string, status: string, adminId?: string) {
    return prisma.ticket.update({
      where: { id },
      data: { status: status as any, ...(adminId ? { adminId } : {}) },
    });
  }
}

export const ticketRepository = new TicketRepository();
export default ticketRepository;
