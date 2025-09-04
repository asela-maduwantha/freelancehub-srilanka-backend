// User Types
export type UserRole = 'freelancer' | 'client' | 'admin';
export type UserStatus = 'active' | 'inactive';

// OTP Types
export type OtpType = 'email_verification' | 'password_reset';

// Freelancer Types
export type ExperienceLevel = 'beginner' | 'intermediate' | 'expert';
export type AvailabilityStatus = 'available' | 'busy' | 'unavailable';
export type ProficiencyLevel = 'basic' | 'intermediate' | 'fluent' | 'native';

// Project Types
export type ProjectType = 'fixed_price' | 'hourly';
export type BudgetType = 'fixed' | 'range';
export type ProjectVisibility = 'public' | 'invite_only';
export type ProjectStatus = 'draft' | 'active' | 'closed' | 'completed' | 'cancelled';

// Proposal Types
export type ProposalStatus = 'submitted' | 'shortlisted' | 'accepted' | 'rejected' | 'withdrawn';

// Contract Types
export type ContractType = 'fixed_price' | 'hourly';
export type ContractStatus = 'active' | 'completed' | 'cancelled' | 'disputed';

// Milestone Types
export type MilestoneStatus = 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected';

// Payment Types
export type EscrowStatus = 'held' | 'released' | 'refunded';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

// Message Types
export type MessageType = 'text' | 'file' | 'system';

// Review Types
export type ReviewerType = 'client' | 'freelancer';

// Notification Types
export type NotificationType = 'message' | 'proposal' | 'payment' | 'milestone' | 'review';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

// Dispute Types
export type DisputeType = 'payment' | 'quality' | 'communication' | 'other';
export type DisputeStatus = 'open' | 'in_review' | 'resolved' | 'escalated';

// General Types
export type Currency = 'USD' | 'EUR' | 'LKR';
export type CompanySize = '1-10' | '11-50' | '51-200' | '201-500' | '500+';
export type SortOrder = 'asc' | 'desc';

// Base Interfaces
export interface BaseEntity {
  _id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Location {
  country: string;
  city: string;
  province: string;
}

export interface WorkingHours {
  timezone: string;
  schedule: Record<string, any>;
}

export interface Availability {
  status: AvailabilityStatus;
  hoursPerWeek: number;
  workingHours: WorkingHours;
}

export interface PortfolioItem {
  title: string;
  description: string;
  imageUrl: string;
  projectUrl?: string;
  tags: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  year: number;
}

export interface Certification {
  name: string;
  issuer: string;
  year: number;
  url?: string;
}

export interface Language {
  language: string;
  proficiency: ProficiencyLevel;
}

export interface Budget {
  type: BudgetType;
  amount?: number;
  minAmount?: number;
  maxAmount?: number;
  currency: Currency;
}

export interface Duration {
  estimated: number; // in days
  deadline?: Date;
}

export interface Attachment {
  filename: string;
  url: string;
  size?: number;
  uploadedAt?: Date;
  description?: string;
  mimeType?: string;
}

export interface ProposedBudget {
  amount: number;
  currency: Currency;
  type: ProjectType;
}

export interface Timeline {
  estimatedDuration: number;
  proposedDeadline: Date;
}

export interface Milestone {
  _id?: string;
  title: string;
  description: string;
  amount: number;
  deadline?: Date;
  durationDays?: number;
  status?: MilestoneStatus;
  deliverables?: Attachment[];
  feedback?: string;
  completedAt?: Date;
}

export interface Ratings {
  overall: number; // 1-5
  quality: number;
  communication: number;
  timeliness: number;
  professionalism: number;
}

export interface ReviewResponse {
  content: string;
  respondedAt: Date;
}

export interface RelatedEntity {
  entityType: string;
  entityId: string;
}

export interface UnreadCount {
  userId: string;
  count: number;
}

export interface LastMessage {
  content: string;
  senderId: string;
  timestamp: Date;
}

export interface DisputeResolution {
  decision: string;
  explanation: string;
  resolvedBy: string;
  resolvedAt: Date;
}

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
