export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
}

export interface AuthenticatedRequest {
  user: AuthenticatedUser;
}
