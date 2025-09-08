import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Exclude } from 'class-transformer';

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  @Exclude()
  password: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  profilePicture: string;

  @Prop({ required: true, enum: ['freelancer', 'client'] })
  role: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop()
  lastLoginAt: Date;

  @Prop()
  stripeAccountId: string;

  @Prop({
    default: 'pending',
    enum: ['pending', 'complete', 'incomplete', 'error'],
  })
  stripeAccountStatus: string;

  @Prop()
  stripeCustomerId: string;

  @Prop([
    {
      id: String,
      type: String, // 'card', 'bank_account'
      last4: String,
      brand: String,
      expiryMonth: Number,
      expiryYear: Number,
      isDefault: { type: Boolean, default: false },
    },
  ])
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
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ emailVerified: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });
