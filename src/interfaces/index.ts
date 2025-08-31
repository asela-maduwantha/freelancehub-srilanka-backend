export interface IBaseEntity {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUser {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string[];
  activeRole: string;
  emailVerified: boolean;
  profilePicture?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProject {
  _id: string;
  title: string;
  description: string;
  clientId: string;
  status: 'draft' | 'open' | 'in-progress' | 'completed' | 'cancelled';
  budget: {
    min: number;
    max: number;
    currency: string;
  };
  deadline: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IContract {
  _id: string;
  projectId: string;
  clientId: string;
  freelancerId: string;
  status: 'active' | 'completed' | 'cancelled' | 'disputed';
  terms: {
    budget: number;
    type: 'fixed' | 'hourly';
    startDate: Date;
    endDate: Date;
  };
  milestones: IMilestone[];
  totalPaid: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMilestone {
  _id: string;
  title: string;
  description: string;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'in-progress' | 'submitted' | 'approved' | 'rejected';
  submissions: ISubmission[];
}

export interface ISubmission {
  files: string[];
  description: string;
  submittedAt: Date;
  feedback: string;
}

export interface IPayment {
  _id: string;
  contractId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  type: 'milestone' | 'bonus' | 'refund';
  createdAt: Date;
}

export interface IReview {
  _id: string;
  contractId: string;
  reviewerId: string;
  revieweeId: string;
  type: 'client-to-freelancer' | 'freelancer-to-client';
  ratings: {
    overall: number;
    communication: number;
    quality: number;
    timeliness: number;
  };
  comment: string;
  createdAt: Date;
}

export interface IApiResponse<T = any> {
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
}

export interface IPaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IPaginationResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface IFileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface IEmailOptions {
  to: string;
  subject: string;
  template?: string;
  context?: Record<string, any>;
  html?: string;
  text?: string;
}
