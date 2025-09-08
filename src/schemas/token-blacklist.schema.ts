import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class TokenBlacklist {
  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ required: true })
  userId: string;

  @Prop({ enum: ['logout', 'password_reset', 'security'], default: 'logout' })
  reason: string;
}

export type TokenBlacklistDocument = TokenBlacklist & Document;
export const TokenBlacklistSchema = SchemaFactory.createForClass(TokenBlacklist);

// TTL index to automatically remove expired tokens
TokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
TokenBlacklistSchema.index({ token: 1 });
