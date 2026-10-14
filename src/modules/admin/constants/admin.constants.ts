export const ADMIN_ERRORS = {
  USER_NOT_FOUND: 'User not found',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
  INVALID_ACTION: 'Invalid action',
  CANNOT_MODIFY_ADMIN: 'Cannot modify admin account',
  CONFIG_NOT_FOUND: 'Configuration not found',
  INVALID_CONFIG: 'Invalid configuration',
} as const;

export const ADMIN_SUCCESS = {
  USER_BANNED: 'User banned successfully',
  USER_UNBANNED: 'User unbanned successfully',
  USER_DELETED: 'User deleted successfully',
  ROLE_UPDATED: 'Role updated successfully',
  CONFIG_UPDATED: 'Configuration updated successfully',
  STATS_RETRIEVED: 'Statistics retrieved successfully',
} as const;
