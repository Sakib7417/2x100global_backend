export const CONTENT_ERRORS = {
  POST_NOT_FOUND: 'Post not found',
  NEWS_NOT_FOUND: 'News item not found',
  IMAGE_REQUIRED: 'Post image is required',
  TITLE_REQUIRED: 'Title is required',
  DESCRIPTION_REQUIRED: 'Description is required',
  MESSAGE_REQUIRED: 'Message is required',
} as const;

export const CONTENT_SUCCESS = {
  POST_CREATED: 'Post created successfully',
  POST_UPDATED: 'Post updated successfully',
  POST_DELETED: 'Post deleted successfully',
  NEWS_CREATED: 'News item created successfully',
  NEWS_UPDATED: 'News item updated successfully',
  NEWS_DELETED: 'News item deleted successfully',
} as const;

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
