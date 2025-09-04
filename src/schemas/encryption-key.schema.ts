import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EncryptionKeyDocument = EncryptionKey & Document;

@Schema({ timestamps: true })
export class EncryptionKey {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId: Types.ObjectId; // The user who owns this key share

  @Prop({ required: true })
  encryptedKeyShare: string; // The user's share of the conversation key, encrypted with their public key

  @Prop({ required: true })
  keyVersion: string; // Version of the key for rotation support

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: null })
  expiresAt: Date;

  @Prop({ type: Object, default: {} })
  metadata: {
    algorithm?: string;
    keyLength?: number;
    createdBy?: string;
    rotationReason?: string;
  };

  // Timestamps (automatically added by @Schema({ timestamps: true }))
  createdAt?: Date;
  updatedAt?: Date;
}

export const EncryptionKeySchema = SchemaFactory.createForClass(EncryptionKey);

// Create indexes for efficient key lookups
EncryptionKeySchema.index({ conversationId: 1, ownerId: 1 });
EncryptionKeySchema.index({ ownerId: 1, isActive: 1 });
EncryptionKeySchema.index({ keyVersion: 1 });

// TTL index for automatic key expiration
EncryptionKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
