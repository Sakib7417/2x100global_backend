export interface CreatePostDTO {
  title: string;
  description: string;
  imageUrl: string;
  authorId?: string;
}

export interface UpdatePostDTO {
  title?: string;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface CreateNewsDTO {
  title: string;
  message: string;
  authorId?: string;
}

export interface UpdateNewsDTO {
  title?: string;
  message?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface ContentQueryDTO {
  page?: number;
  limit?: number;
  activeOnly?: boolean;
}
