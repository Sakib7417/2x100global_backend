import { Request, Response, NextFunction } from 'express';
import { contentService } from '../service/content.service';
import { CreatePostInput, UpdatePostInput, CreateNewsInput, UpdateNewsInput } from '../validator/content.validator';
import { AuthRequest } from '../../../middlewares/auth.middleware';
import { uploadToR2, R2_BUCKETS } from '../../../config/storage';

export class ContentController {
  // ===== Public endpoints (user) =====

  async getPublicPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await contentService.getPosts(req.query as any, true);
      res.status(200).json({ success: true, data: result.data, meta: { total: result.total, page: result.page, limit: result.limit } });
    } catch (error) {
      next(error);
    }
  }

  async getPublicNews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await contentService.getNews(req.query as any, true);
      res.status(200).json({ success: true, data: result.data, meta: { total: result.total, page: result.page, limit: result.limit } });
    } catch (error) {
      next(error);
    }
  }

  // ===== Admin Posts =====

  async createPost(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = req.file as Express.Multer.File | undefined;
      const body = req.body;
      if (!file) {
        res.status(400).json({ success: false, message: 'Post image is required' });
        return;
      }
      const imageUrl = await uploadToR2(file, R2_BUCKETS.POSTS);
      const authorId = req.user?.role === 'ADMIN' ? undefined : req.user?.userId;
      const post = await contentService.createPost({
        title: body.title,
        description: body.description,
        imageUrl,
        authorId,
      });
      res.status(201).json({ success: true, message: 'Post created successfully', data: post });
    } catch (error) {
      next(error);
    }
  }

  async getAdminPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await contentService.getPosts(req.query as any, false);
      res.status(200).json({ success: true, data: result.data, meta: { total: result.total, page: result.page, limit: result.limit } });
    } catch (error) {
      next(error);
    }
  }

  async getAdminPostById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const post = await contentService.getPostById(req.params.id);
      res.status(200).json({ success: true, data: post });
    } catch (error) {
      next(error);
    }
  }

  async updatePost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = req.file as Express.Multer.File | undefined;
      const body = req.body;
      const data: any = {};
      if (body.title !== undefined) data.title = body.title;
      if (body.description !== undefined) data.description = body.description;
      if (body.isActive !== undefined) data.isActive = body.isActive === 'true' || body.isActive === true;
      if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder);
      if (file) {
        data.imageUrl = await uploadToR2(file, R2_BUCKETS.POSTS);
      }

      const post = await contentService.updatePost(req.params.id, data);
      res.status(200).json({ success: true, message: 'Post updated successfully', data: post });
    } catch (error) {
      next(error);
    }
  }

  async deletePost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await contentService.deletePost(req.params.id);
      res.status(200).json({ success: true, message: 'Post deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  // ===== Admin News =====

  async createNews(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CreateNewsInput = req.body;
      const authorId = req.user?.role === 'ADMIN' ? undefined : req.user?.userId;
      const news = await contentService.createNews({ ...data, authorId });
      res.status(201).json({ success: true, message: 'News item created successfully', data: news });
    } catch (error) {
      next(error);
    }
  }

  async getAdminNews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await contentService.getNews(req.query as any, false);
      res.status(200).json({ success: true, data: result.data, meta: { total: result.total, page: result.page, limit: result.limit } });
    } catch (error) {
      next(error);
    }
  }

  async updateNews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: UpdateNewsInput = req.body;
      const news = await contentService.updateNews(req.params.id, data);
      res.status(200).json({ success: true, message: 'News item updated successfully', data: news });
    } catch (error) {
      next(error);
    }
  }

  async deleteNews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await contentService.deleteNews(req.params.id);
      res.status(200).json({ success: true, message: 'News item deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const contentController = new ContentController();
export default contentController;
