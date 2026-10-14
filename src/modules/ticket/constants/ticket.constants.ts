export const TICKET_ERRORS = {
  TICKET_NOT_FOUND: 'Ticket not found',
  MESSAGE_REQUIRED: 'Message is required',
  SUBJECT_REQUIRED: 'Subject is required',
  TICKET_CLOSED: 'Ticket is closed and cannot receive new messages',
  UNAUTHORIZED: 'You do not have access to this ticket',
} as const;

export const TICKET_SUCCESS = {
  TICKET_CREATED: 'Ticket created successfully',
  MESSAGE_SENT: 'Message sent successfully',
  TICKET_CLOSED: 'Ticket closed successfully',
  TICKET_REOPENED: 'Ticket reopened successfully',
} as const;

/** Max file size per attachment image — 5MB, same as post images. */
export const TICKET_MAX_FILE_SIZE = 5 * 1024 * 1024;
/** Max number of attachment images per message. */
export const TICKET_MAX_ATTACHMENTS = 5;
