import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'otp_verifications',
})
export class OtpVerification extends Document {
  @Prop({ required: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  otp: string;

  @Prop({
    required: true,
    enum: ['email_verification', 'password_reset', 'login'],
  })
  purpose: string;

  @Prop({ default: false })
  isUsed: boolean;

  @Prop({ default: 0, min: 0 })
  attempts: number;

  @Prop({ default: 3, min: 1 })
  maxAttempts: number;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  usedAt?: Date;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  // Virtual fields
  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  get isValid(): boolean {
    return !this.isUsed && !this.isExpired && this.attempts < this.maxAttempts;
  }

  get remainingAttempts(): number {
    return Math.max(0, this.maxAttempts - this.attempts);
  }

  get isAttemptsExhausted(): boolean {
    return this.attempts >= this.maxAttempts;
  }
}

export const OtpVerificationSchema =
  SchemaFactory.createForClass(OtpVerification);

// Create indexes
OtpVerificationSchema.index({ email: 1 });
OtpVerificationSchema.index({ otp: 1 });
OtpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
OtpVerificationSchema.index({ email: 1, purpose: 1 });
OtpVerificationSchema.index({ isUsed: 1 });

// Add virtual fields
OtpVerificationSchema.virtual('isExpired').get(function () {
  return new Date() > this.expiresAt;
});

OtpVerificationSchema.virtual('isValid').get(function () {
  return !this.isUsed && !this.isExpired && this.attempts < this.maxAttempts;
});

OtpVerificationSchema.virtual('remainingAttempts').get(function () {
  return Math.max(0, this.maxAttempts - this.attempts);
});

OtpVerificationSchema.virtual('isAttemptsExhausted').get(function () {
  return this.attempts >= this.maxAttempts;
});
