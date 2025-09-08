import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Exclude } from 'class-transformer';

// Define subdocument schema for payment methods
const PaymentMethodSchema = new MongooseSchema({
  id: { type: String, required: true },
  type: { type: String, required: true }, // 'card', 'bank_account'
  last4: { type: String },
  brand: { type: String },
  expiryMonth: { type: Number },
  expiryYear: { type: Number },
  isDefault: { type: Boolean, default: false },
}, { _id: false });

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  @Exclude()
  password: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop()
  profilePicture: string;

  @Prop({ required: true, type: [String], enum: ['freelancer', 'client'] })
  role: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop()
  lastLoginAt: Date;

  // Login attempt tracking for security
  @Prop({ default: 0 })
  loginAttempts: number;

  @Prop()
  lockUntil?: Date;

  @Prop()
  lastFailedLogin?: Date;

  @Prop()
  stripeAccountId: string;

  @Prop({
    default: 'pending',
    enum: ['pending', 'complete', 'incomplete', 'error'],
  })
  stripeAccountStatus: string;

  @Prop()
  stripeCustomerId: string;

  @Prop({ type: [PaymentMethodSchema], default: [] })
  savedPaymentMethods: Array<{
    id: string;
    type: string;
    last4: string;
    brand: string;
    expiryMonth: number;
    expiryYear: number;
    isDefault: boolean;
  }>;

  @Prop()
  fcmToken: string;

  @Prop({
    type: {
      emailNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
      messageNotifications: { type: Boolean, default: true },
      proposalNotifications: { type: Boolean, default: true },
      paymentNotifications: { type: Boolean, default: true },
    },
    default: {
      emailNotifications: true,
      pushNotifications: true,
      messageNotifications: true,
      proposalNotifications: true,
      paymentNotifications: true,
    },
  })
  notificationPreferences: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    messageNotifications: boolean;
    proposalNotifications: boolean;
    paymentNotifications: boolean;
  };

  // Computed property for full name
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  // Check if account is locked
  get isLocked(): boolean {
    return !!(this.lockUntil && this.lockUntil > new Date());
  }

  // Check if user has specific role
  hasRole(role: string): boolean {
    return this.role.includes(role);
  }
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);

// Add virtual for fullName
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Add instance methods
UserSchema.methods.hasRole = function(role: string): boolean {
  return this.role.includes(role);
};

UserSchema.methods.isAccountLocked = function(): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

// Constants for account lockout
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCK_TIME = 2 * 60 * 60 * 1000; // 2 hours

// Pre-save middleware to handle account locking
UserSchema.pre('save', function(next) {
  // If we have a previous value for failed attempts and this isn't a new user
  if (!this.isModified('loginAttempts') && !this.isNew) {
    return next();
  }

  // If we have exceeded max attempts and there is no lock or lock has expired
  if (this.loginAttempts >= MAX_LOGIN_ATTEMPTS && (!this.lockUntil || this.lockUntil <= new Date())) {
    this.lockUntil = new Date(Date.now() + LOCK_TIME);
  }

  next();
});

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ emailVerified: 1 });
UserSchema.index({ lockUntil: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });

// Compound indexes for common query patterns
UserSchema.index({ email: 1, isActive: 1 });
UserSchema.index({ role: 1, isActive: 1 });
UserSchema.index({ emailVerified: 1, isActive: 1 });
UserSchema.index({ isActive: 1, createdAt: -1 });
