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

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop()
  lastLoginAt: Date;

  @Prop({ default: true })
  isActive: boolean;

  // Automatic timestamps (explicitly declared for TypeScript)
  createdAt?: Date;
  updatedAt?: Date;
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ emailVerified: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });
