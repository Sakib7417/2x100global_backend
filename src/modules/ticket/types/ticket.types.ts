export interface CreateTicketDTO {
  subject: string;
  message: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  /** Optional array of attachment image URLs (built by the controller from multer files). */
  attachments?: string[] | null;
}

export interface ReplyTicketDTO {
  message: string;
  /** Optional array of attachment image URLs. */
  attachments?: string[] | null;
}

export interface TicketQueryDTO {
  page?: number;
  limit?: number;
  status?: 'OPEN' | 'REPLIED' | 'CLOSED';
}
