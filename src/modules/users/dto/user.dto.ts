export interface UpdateProfileDTO {
  name?: string;
  phone?: string;
  country?: string;
  walletAddress?: string;
}

export interface UserListQueryDTO {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}
