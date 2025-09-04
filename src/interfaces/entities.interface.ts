import {
  BaseEntity,
  UserRole,
  OtpType,
  ExperienceLevel,
  Availability,
  PortfolioItem,
  Education,
  Certification,
  Language,
  Location,
  ProjectType,
  Budget,
  Duration,
  Attachment,
  ProjectVisibility,
  ProjectStatus,
  ProposalStatus,
  ProposedBudget,
  Timeline,
  Milestone,
  ContractType,
  ContractStatus,
  PaymentStatus,
  EscrowStatus,
  UnreadCount,
  LastMessage,
  MessageType,
  ReviewerType,
  Ratings,
  ReviewResponse,
  NotificationType,
  NotificationPriority,
  RelatedEntity,
  DisputeType,
  DisputeStatus,
  DisputeResolution,
  Currency
} from '../types';

// Core Entity Interfaces
export interface IUser extends BaseEntity {
  email: string;
  password: string;
  name: string;
  profilePicture?: string;
  role: UserRole;
  emailVerified: boolean;
  lastLoginAt?: Date;
  isActive: boolean;
}

export interface IOtp extends BaseEntity {
  email: string;
  otp: string;
  otpType: OtpType;
  attempts: number;
  isUsed: boolean;
  expiresAt: Date;
}

export interface IFreelancerProfile extends BaseEntity {
  userId: string;
  professionalTitle: string;
  description: string;
  skills: string[];
  categories: string[];
  experienceLevel: ExperienceLevel;
  hourlyRate: number;
  availability: Availability;
  portfolio: PortfolioItem[];
  education: Education[];
  certifications: Certification[];
  languages: Language[];
  location: Location;
  profileCompleteness: number;
  publicProfileUrl: string;
}

export interface IClientProfile extends BaseEntity {
  userId: string;
  companyName?: string;
  industry?: string;
  companySize?: string;
  website?: string;
  description?: string;
  location: Location;
}

export interface IProject extends BaseEntity {
  clientId: string;
  title: string;
  description: string;
  category: string;
  requiredSkills: string[];
  projectType: ProjectType;
  budget: Budget;
  duration: Duration;
  attachments: Attachment[];
  visibility: ProjectVisibility;
  status: ProjectStatus;
  proposalCount: number;
  viewCount: number;
  tags: string[];
  publishedAt?: Date;
  closedAt?: Date;
}

export interface IProposal extends BaseEntity {
  projectId: string;
  freelancerId: string;
  coverLetter: string;
  proposedBudget: ProposedBudget;
  timeline: Timeline;
  attachments: Attachment[];
  milestones: Milestone[];
  status: ProposalStatus;
  submittedAt: Date;
  respondedAt?: Date;
}

export interface IContract extends BaseEntity {
  projectId: string;
  proposalId: string;
  clientId: string;
  freelancerId: string;
  title: string;
  description: string;
  totalAmount: number;
  currency: Currency;
  contractType: ContractType;
  terms: string;
  milestones: Milestone[];
  status: ContractStatus;
  startDate: Date;
  endDate?: Date;
}

export interface IPayment extends BaseEntity {
  contractId: string;
  milestoneId?: string;
  payerId: string;
  payeeId: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  currency: Currency;
  paymentMethod: string;
  payhereTransactionId?: string;
  escrowStatus: EscrowStatus;
  status: PaymentStatus;
  paidAt?: Date;
  releasedAt?: Date;
}

export interface IConversation extends BaseEntity {
  participants: string[];
  projectId?: string;
  contractId?: string;
  lastMessage?: LastMessage;
  unreadCount: UnreadCount[];
  isActive: boolean;
}

export interface IMessage extends BaseEntity {
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  messageType: MessageType;
  attachments: Attachment[];
  isRead: boolean;
  readAt?: Date;
}

export interface IReview extends BaseEntity {
  contractId: string;
  reviewerId: string;
  revieweeId: string;
  reviewerType: ReviewerType;
  ratings: Ratings;
  comment: string;
  isPublic: boolean;
  response?: ReviewResponse;
}

export interface INotification extends BaseEntity {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  relatedEntity?: RelatedEntity;
  priority: NotificationPriority;
  isRead: boolean;
  readAt?: Date;
}

export interface ICategory extends BaseEntity {
  name: string;
  description: string;
  iconUrl?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface ISkill extends BaseEntity {
  name: string;
  categoryId: string;
  description?: string;
  isActive: boolean;
  popularity: number;
}

export interface IDispute extends BaseEntity {
  contractId: string;
  initiatorId: string;
  respondentId: string;
  type: DisputeType;
  subject: string;
  description: string;
  evidence: Attachment[];
  status: DisputeStatus;
  resolution?: DisputeResolution;
}

export interface ISavedProject extends BaseEntity {
  userId: string;
  projectId: string;
  savedAt: Date;
}
