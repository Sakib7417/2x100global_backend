import { contentRepository } from '../repository/content.repository';
import { CONTENT_ERRORS } from '../constants/content.constants';
import { CreatePostDTO, UpdatePostDTO, CreateNewsDTO, UpdateNewsDTO, ContentQueryDTO } from '../types/content.types';
import { NotFoundError, BadRequestError } from '../../../utils/errors';

export class ContentService {
  // ===== Posts =====

  async createPost(data: CreatePostDTO) {
    if (!data.imageUrl) throw new BadRequestError(CONTENT_ERRORS.IMAGE_REQUIRED);
    return contentRepository.createPost(data);
  }

  async getPosts(query: ContentQueryDTO, publicAccess = false) {
    return contentRepository.findAllPosts({
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 20,
      activeOnly: publicAccess,
    });
  }

  async getPostById(id: string) {
    const post = await contentRepository.findPostById(id);
    if (!post) throw new NotFoundError(CONTENT_ERRORS.POST_NOT_FOUND);
    return post;
  }

  async updatePost(id: string, data: UpdatePostDTO) {
    const post = await contentRepository.findPostById(id);
    if (!post) throw new NotFoundError(CONTENT_ERRORS.POST_NOT_FOUND);
    return contentRepository.updatePost(id, data);
  }

  async deletePost(id: string) {
    const post = await contentRepository.findPostById(id);
    if (!post) throw new NotFoundError(CONTENT_ERRORS.POST_NOT_FOUND);
    return contentRepository.deletePost(id);
  }

  // ===== News =====

  async createNews(data: CreateNewsDTO) {
    return contentRepository.createNews(data);
  }

  async getNews(query: ContentQueryDTO, publicAccess = false) {
    return contentRepository.findAllNews({
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 20,
      activeOnly: publicAccess,
    });
  }

  async getNewsById(id: string) {
    const news = await contentRepository.findNewsById(id);
    if (!news) throw new NotFoundError(CONTENT_ERRORS.NEWS_NOT_FOUND);
    return news;
  }

  async updateNews(id: string, data: UpdateNewsDTO) {
    const news = await contentRepository.findNewsById(id);
    if (!news) throw new NotFoundError(CONTENT_ERRORS.NEWS_NOT_FOUND);
    return contentRepository.updateNews(id, data);
  }

  async deleteNews(id: string) {
    const news = await contentRepository.findNewsById(id);
    if (!news) throw new NotFoundError(CONTENT_ERRORS.NEWS_NOT_FOUND);
    return contentRepository.deleteNews(id);
  }
}

export const contentService = new ContentService();
export default contentService;
