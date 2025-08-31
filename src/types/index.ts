export type UserRole = 'freelancer' | 'client' | 'both' | 'admin';

export type UserStatus = 'active' | 'suspended' | 'banned' | 'pending' | 'inactive';

export type ProjectStatus = 'draft' | 'open' | 'in-progress' | 'completed' | 'cancelled';

export type ContractStatus = 'active' | 'completed' | 'cancelled' | 'disputed';

export type MilestoneStatus = 'pending' | 'in-progress' | 'submitted' | 'approved' | 'rejected';

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type PaymentType = 'milestone' | 'bonus' | 'refund';

export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export type DisputeStatus = 'open' | 'under-review' | 'resolved' | 'closed';

export type ReviewType = 'client-to-freelancer' | 'freelancer-to-client';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'LKR' | 'INR';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'expert';

export type AvailabilityStatus = 'full-time' | 'part-time' | 'not-available';

export type ProficiencyLevel = 'basic' | 'conversational' | 'fluent' | 'native';

export type CompanySize = '1-10' | '11-50' | '51-200' | '200+';

export type SortOrder = 'asc' | 'desc';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type Environment = 'development' | 'staging' | 'production' | 'test';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export type FileType = 'image' | 'document' | 'video' | 'audio' | 'other';

export type NotificationType =
  | 'project_created'
  | 'proposal_received'
  | 'proposal_accepted'
  | 'proposal_rejected'
  | 'milestone_submitted'
  | 'milestone_approved'
  | 'milestone_rejected'
  | 'payment_received'
  | 'contract_completed'
  | 'review_received'
  | 'dispute_created'
  | 'system_notification';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

// Generic types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type NonNullable<T> = T extends null | undefined ? never : T;

// API Response types
export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
};

export type PaginatedResponse<T> = ApiResponse<{
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}>;

// Form types
export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterData = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
};

export type OtpVerification = {
  email: string;
  otp: string;
};

// Filter types
export type DateRange = {
  start: Date;
  end: Date;
};

export type PriceRange = {
  min: number;
  max: number;
};

export type ProjectFilters = {
  category?: string;
  skills?: string[];
  budget?: PriceRange;
  deadline?: DateRange;
  status?: ProjectStatus[];
  clientId?: string;
};

export type UserFilters = {
  role?: UserRole[];
  skills?: string[];
  location?: string;
  experienceLevel?: ExperienceLevel[];
  availability?: AvailabilityStatus[];
};

// Search types
export type SearchOptions = {
  query: string;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: SortOrder;
  page?: number;
  limit?: number;
};

// File upload types
export type FileUploadResult = {
  url: string;
  key: string;
  bucket: string;
  size: number;
  mimeType: string;
};

export type UploadOptions = {
  maxSize?: number;
  allowedTypes?: string[];
  folder?: string;
  public?: boolean;
};
