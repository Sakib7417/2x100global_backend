import prisma from '../../../config/database';

export class ContentRepository {
  // ===== Posts =====

  async createPost(data: { title: string; description: string; imageUrl: string; authorId?: string }) {
    return prisma.post.create({ data });
  }

  async findPostById(id: string) {
    return prisma.post.findUnique({ where: { id } });
  }

  async findAllPosts(options: { page?: number; limit?: number; activeOnly?: boolean } = {}) {
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 20;
    const where: any = {};
    if (options.activeOnly) where.isActive = true;

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.post.count({ where }),
    ]);

    return { data: posts, total, page, limit };
  }

  async updatePost(id: string, data: any) {
    return prisma.post.update({ where: { id }, data });
  }

  async deletePost(id: string) {
    return prisma.post.delete({ where: { id } });
  }

  // ===== News =====

  async createNews(data: { title: string; message: string; authorId?: string }) {
    return prisma.news.create({ data });
  }

  async findNewsById(id: string) {
    return prisma.news.findUnique({ where: { id } });
  }

  async findAllNews(options: { page?: number; limit?: number; activeOnly?: boolean } = {}) {
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 20;
    const where: any = {};
    if (options.activeOnly) where.isActive = true;

    const [news, total] = await Promise.all([
      prisma.news.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.news.count({ where }),
    ]);

    return { data: news, total, page, limit };
  }

  async updateNews(id: string, data: any) {
    return prisma.news.update({ where: { id }, data });
  }

  async deleteNews(id: string) {
    return prisma.news.delete({ where: { id } });
  }
}

export const contentRepository = new ContentRepository();
export default contentRepository;
