export const POOL_BONUS_ERRORS = {
  REQUEST_NOT_FOUND: 'Pool bonus request not found',
  INSUFFICIENT_BALANCE: 'Insufficient pool bonus balance',
  INVALID_AMOUNT: 'Invalid amount',
  REQUEST_ALREADY_PENDING: 'You already have a pending pool bonus request',
  REQUEST_NOT_PENDING: 'Only pending requests can be modified',
  REQUEST_NOT_APPROVED: 'Only approved requests can be processed',
  DESTINATION_ADDRESS_REQUIRED: 'Destination address is required for withdrawal',
  REJECTION_REASON_REQUIRED: 'Rejection reason is required',
  APPROVED_AMOUNT_EXCEEDS_REQUEST: 'Approved amount cannot exceed requested amount',
  CANNOT_CANCEL_PROCESSED: 'Cannot cancel a processed request',
  SELF_APPROVAL_NOT_ALLOWED: 'Admin cannot approve their own request',
} as const;

export const POOL_BONUS_SUCCESS = {
  REQUEST_CREATED: 'Pool bonus request submitted successfully',
  REQUEST_APPROVED: 'Pool bonus request approved and processed',
  REQUEST_REJECTED: 'Pool bonus request rejected',
  REQUEST_UPDATED: 'Pool bonus request amount updated and approved',
  REQUEST_CANCELLED: 'Pool bonus request cancelled',
} as const;

export const MIN_POOL_BONUS_REQUEST_AMOUNT = 1;
export const MAX_PENDING_REQUESTS_PER_USER = 1;
