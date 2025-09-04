import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class UserLocation {
  @Prop()
  country: string;

  @Prop()
  city: string;

  @Prop()
  state: string;

  @Prop()
  zipCode: string;
}

@Schema({ _id: false })
export class UserLanguage {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ['basic', 'conversational', 'fluent', 'native'] })
  proficiency: string;
}

@Schema({ _id: false })
export class UserStats {
  @Prop({ default: 0 })
  totalJobs: number;

  @Prop({ default: 0 })
  completedJobs: number;

  @Prop({ default: 0 })
  totalEarnings: number;

  @Prop({ default: 0 })
  averageRating: number;

  @Prop({ default: 0 })
  totalReviews: number;
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop()
  phone: string;

  @Prop({ type: UserLocation })
  location: UserLocation;

  @Prop({ type: [UserLanguage], default: [] })
  languages: UserLanguage[];

  @Prop({ default: null })
  profilePicture: string;

  @Prop({ required: true, enum: ['freelancer', 'client'] })
  role: string;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ default: null })
  lastLoginAt: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: UserStats })
  stats: UserStats;

  @Prop({ default: 'active', enum: ['active', 'inactive', 'suspended'] })
  status: string;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  followers: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  following: Types.ObjectId[];

  @Prop()
  stripeAccountId: string;

  @Prop({ default: 'pending', enum: ['pending', 'active', 'restricted', 'complete'] })
  stripeAccountStatus: string;

  @Prop({ type: Types.ObjectId, ref: 'FreelancerProfile' })
  freelancerProfile: Types.ObjectId;

  // Automatic timestamps (explicitly declared for TypeScript)
  createdAt?: Date;
  updatedAt?: Date;
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });
