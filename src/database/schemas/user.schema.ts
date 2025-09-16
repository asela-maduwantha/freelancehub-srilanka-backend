// src/database/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRole } from '../../common/enums/user-role.enum';

// User Profile Sub-schema
@Schema({ _id: false })
export class UserProfile {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop()
  avatar?: string;

  @Prop()
  phone?: string;

  @Prop()
  dateOfBirth?: Date;

  @Prop({ enum: ['male', 'female', 'other'] })
  gender?: string;

  @Prop()
  bio?: string;

  @Prop({
    type: {
      country: String,
      state: String,
      city: String,
      timezone: String,
    },
    _id: false,
  })
  location?: {
    country?: string;
    state?: string;
    city?: string;
    timezone?: string;
  };

  @Prop()
  website?: string;

  @Prop({
    type: {
      linkedin: String,
      github: String,
      portfolio: String,
    },
    _id: false,
  })
  socialLinks?: {
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };
}

// Education Sub-schema
@Schema({ _id: false })
export class Education {
  @Prop({ required: true })
  degree: string;

  @Prop({ required: true })
  institution: string;

  @Prop({ required: true })
  year: number;
}

// Certification Sub-schema
@Schema({ _id: false })
export class Certification {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  issuer: string;

  @Prop({ required: true })
  date: Date;

  @Prop()
  url?: string;
}

// Portfolio Item Sub-schema
@Schema({ _id: false })
export class PortfolioItem {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [String] })
  images?: string[];

  @Prop()
  url?: string;

  @Prop({ type: [String] })
  technologies?: string[];
}

// Language Sub-schema
@Schema({ _id: false })
export class Language {
  @Prop({ required: true })
  language: string;

  @Prop({
    enum: ['basic', 'conversational', 'fluent', 'native'],
    required: true,
  })
  proficiency: string;
}

// Freelancer Data Sub-schema
@Schema({ _id: false })
export class FreelancerData {
  @Prop({ type: [String], default: [] })
  skills: string[];

  @Prop({ min: 1 })
  hourlyRate?: number;

  @Prop({ enum: ['full-time', 'part-time', 'contract'] })
  availability?: string;

  @Prop({ enum: ['beginner', 'intermediate', 'expert'] })
  experience?: string;

  @Prop({ type: [Language], default: [] })
  languages?: Language[];

  @Prop({ type: [Education], default: [] })
  education?: Education[];

  @Prop({ type: [Certification], default: [] })
  certifications?: Certification[];

  @Prop({ type: [PortfolioItem], default: [] })
  portfolio?: PortfolioItem[];

  @Prop({ default: 0, min: 0 })
  totalEarned: number;

  @Prop({ default: 0, min: 0 })
  completedJobs: number;

  @Prop({ default: 0, min: 0, max: 5 })
  rating: number;

  @Prop({ default: 0, min: 0 })
  reviewCount: number;
}

// Client Data Sub-schema
@Schema({ _id: false })
export class ClientData {
  @Prop()
  companyName?: string;

  @Prop({ enum: ['1-10', '11-50', '51-200', '201-500', '500+'] })
  companySize?: string;

  @Prop()
  industry?: string;

  @Prop({ default: 0, min: 0 })
  totalSpent: number;

  @Prop({ default: 0, min: 0 })
  postedJobs: number;

  @Prop({ default: 0, min: 0, max: 5 })
  rating: number;

  @Prop({ default: 0, min: 0 })
  reviewCount: number;
}

// Admin Data Sub-schema
@Schema({ _id: false })
export class AdminData {
  @Prop({ type: [String], default: [] })
  permissions: string[];

  @Prop()
  lastLoginAt?: Date;
}

// Main User Schema
@Schema({
  timestamps: true,
  collection: 'users',
})
export class User extends Document {
  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, enum: UserRole })
  role: UserRole;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: UserProfile })
  profile?: UserProfile;

  @Prop({ type: FreelancerData })
  freelancerData?: FreelancerData;

  @Prop({ type: ClientData })
  clientData?: ClientData;

  @Prop({ type: AdminData })
  adminData?: AdminData;

  @Prop()
  stripeCustomerId?: string;

  @Prop()
  stripeAccountId?: string;

  @Prop()
  lastLoginAt?: Date;

  @Prop()
  deletedAt?: Date;

  // Virtual fields
  get fullName(): string {
    return `${this.profile?.firstName} ${this.profile?.lastName}`.trim();
  }

  get isFreelancer(): boolean {
    return this.role === UserRole.FREELANCER;
  }

  get isClient(): boolean {
    return this.role === UserRole.CLIENT;
  }

  get isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }
}

export const UserSchema = SchemaFactory.createForClass(User);

// Create indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ 'freelancerData.skills': 1 });
UserSchema.index({ 'freelancerData.hourlyRate': 1 });
UserSchema.index({ 'profile.location.country': 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index(
  { 'freelancerData.rating': -1, 'freelancerData.completedJobs': -1 },
  { sparse: true },
);

// Add virtual fields
UserSchema.virtual('fullName').get(function () {
  return `${this.profile?.firstName} ${this.profile?.lastName}`.trim();
});

UserSchema.virtual('isFreelancer').get(function () {
  return this.role === UserRole.FREELANCER;
});

UserSchema.virtual('isClient').get(function () {
  return this.role === UserRole.CLIENT;
});

UserSchema.virtual('isAdmin').get(function () {
  return this.role === UserRole.ADMIN;
});

// Pre-save middleware
UserSchema.pre('save', function (next) {
  // Initialize role-specific data based on user role
  if (this.isNew) {
    switch (this.role) {
      case UserRole.FREELANCER:
        if (!this.freelancerData) {
          this.freelancerData = new FreelancerData();
        }
        break;
      case UserRole.CLIENT:
        if (!this.clientData) {
          this.clientData = new ClientData();
        }
        break;
      case UserRole.ADMIN:
        if (!this.adminData) {
          this.adminData = new AdminData();
        }
        break;
    }
  }
  next();
});

// Ensure virtuals are included in JSON
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });
