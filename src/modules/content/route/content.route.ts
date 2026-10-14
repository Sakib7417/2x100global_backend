import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { contentController } from '../controller/content.controller';
import { validateRequest } from '../../../middlewares/validation.middleware';
import { authenticate, authorize, authorizeContentCreator } from '../../../middlewares/auth.middleware';
import { createNewsSchema, updateNewsSchema } from '../validator/content.validator';
import { MAX_FILE_SIZE } from '../constants/content.constants';

const router = Router();

// Multer config for post image uploads.
// Files are kept in memory and uploaded directly to Cloudinary by the
// controller — nothing is written to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'));
  },
});

// ===== Public endpoints (user) =====

/**
 * @route   GET /api/v1/content/posts
 * @desc    Get active posts for user dashboard slider
 * @access  Public
 */
router.get('/posts', contentController.getPublicPosts.bind(contentController));

/**
 * @route   GET /api/v1/content/news
 * @desc    Get active news for user dashboard
 * @access  Public
 */
router.get('/news', contentController.getPublicNews.bind(contentController));

// ===== Admin/Creator Posts =====

/**
 * @route   POST /api/v1/content/admin/posts
 * @desc    Create a new post with image (admin or content creator)
 * @access  Admin, ContentCreator
 */
router.post('/admin/posts', authenticate, authorizeContentCreator, upload.single('image'), contentController.createPost.bind(contentController));

/**
 * @route   GET /api/v1/content/admin/posts
 * @desc    Get all posts (admin or content creator)
 * @access  Admin, ContentCreator
 */
router.get('/admin/posts', authenticate, authorizeContentCreator, contentController.getAdminPosts.bind(contentController));

/**
 * @route   PUT /api/v1/content/admin/posts/:id
 * @desc    Update a post (admin or content creator) — image optional
 * @access  Admin, ContentCreator
 */
router.put('/admin/posts/:id', authenticate, authorizeContentCreator, upload.single('image'), contentController.updatePost.bind(contentController));

/**
 * @route   DELETE /api/v1/content/admin/posts/:id
 * @desc    Delete a post (admin or content creator)
 * @access  Admin, ContentCreator
 */
router.delete('/admin/posts/:id', authenticate, authorizeContentCreator, contentController.deletePost.bind(contentController));

// ===== Admin/Creator News =====

/**
 * @route   POST /api/v1/content/admin/news
 * @desc    Create a news item (admin or content creator)
 * @access  Admin, ContentCreator
 */
router.post('/admin/news', authenticate, authorizeContentCreator, validateRequest(createNewsSchema), contentController.createNews.bind(contentController));

/**
 * @route   GET /api/v1/content/admin/news
 * @desc    Get all news items (admin or content creator)
 * @access  Admin, ContentCreator
 */
router.get('/admin/news', authenticate, authorizeContentCreator, contentController.getAdminNews.bind(contentController));

/**
 * @route   PUT /api/v1/content/admin/news/:id
 * @desc    Update a news item (admin or content creator)
 * @access  Admin, ContentCreator
 */
router.put('/admin/news/:id', authenticate, authorizeContentCreator, validateRequest(updateNewsSchema), contentController.updateNews.bind(contentController));

/**
 * @route   DELETE /api/v1/content/admin/news/:id
 * @desc    Delete a news item (admin or content creator)
 * @access  Admin, ContentCreator
 */
router.delete('/admin/news/:id', authenticate, authorizeContentCreator, contentController.deleteNews.bind(contentController));

export default router;
