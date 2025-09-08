// User and Profile schemas
export { User, UserDocument, UserSchema } from './user.schema';
export { Otp, OtpDocument, OtpSchema } from './otp.schema';
export { TokenBlacklist, TokenBlacklistDocument, TokenBlacklistSchema } from './token-blacklist.schema';
export {
  ClientProfile,
  ClientProfileDocument,
  ClientProfileSchema,
} from './client-profile.schema';
export {
  FreelancerProfile,
  FreelancerProfileDocument,
  FreelancerProfileSchema,
  Availability,
  Portfolio,
  Education,
  Certification,
  Language,
  Location,
} from './freelancer-profile.schema';

// Project and Proposal schemas
export * from './project.schema';
export * from './proposal.schema';

// Contract and Payment schemas
export * from './contract.schema';
export * from './payment.schema';

// Communication schemas
export * from './conversation.schema';
export * from './message.schema';

// Review and Rating schemas
export * from './review.schema';

// Dispute schemas
export * from './dispute.schema';

// Category and Skill schemas
export * from './category.schema';
export * from './skill.schema';

// Saved Projects
export * from './saved-project.schema';

// Notifications
export * from './notification.schema';
