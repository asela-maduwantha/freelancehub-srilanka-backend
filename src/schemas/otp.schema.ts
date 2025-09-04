import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Otp {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  otp: string;

  @Prop({ required: true, enum: ['email_verification', 'password_reset'] })
  otpType: string;

  @Prop({ default: 0 })
  attempts: number;

  @Prop({ default: false })
  isUsed: boolean;

  @Prop({ required: true })
  expiresAt: Date;

  createdAt?: Date;
}

export type OtpDocument = Otp & Document;
export const OtpSchema = SchemaFactory.createForClass(Otp);

// Indexes
OtpSchema.index({ email: 1 });
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
OtpSchema.index({ otpType: 1 });
