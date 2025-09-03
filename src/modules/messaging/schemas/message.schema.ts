import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recipientId: Types.ObjectId;

  @Prop({ required: true })
  encryptedContent: string; // The encrypted message content

  @Prop({ required: true })
  iv: string; // Initialization vector for symmetric encryption

  @Prop({ required: true })
  messageHash: string; // Hash of the original message for integrity verification

  @Prop({ default: 'sent' })
  status: 'sent' | 'delivered' | 'read';

  @Prop({ default: null })
  deliveredAt: Date;

  @Prop({ default: null })
  readAt: Date;

  @Prop({ type: Object, default: {} })
  metadata: {
    encryptionAlgorithm?: string;
    keyVersion?: string;
    messageType?: 'text' | 'file' | 'image';
    fileInfo?: {
      name: string;
      size: number;
      type: string;
      url: string;
    };
  };

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: null })
  deletedAt: Date;

  // Timestamps (automatically added by @Schema({ timestamps: true }))
  createdAt?: Date;
  updatedAt?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Create indexes for efficient queries
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });
MessageSchema.index({ recipientId: 1, createdAt: -1 });
MessageSchema.index({ status: 1 });
