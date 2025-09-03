import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  participant1: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  participant2: Types.ObjectId;

  @Prop({ required: true, unique: true })
  conversationId: string; // Unique identifier for the conversation

  @Prop({ default: null })
  lastMessageAt: Date;

  @Prop({ default: null })
  lastMessagePreview: string;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  participants: Types.ObjectId[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Object, default: {} })
  metadata: {
    participant1PublicKey?: string;
    participant2PublicKey?: string;
    encryptionAlgorithm?: string;
    keyExchangeCompleted?: boolean;
  };

  // Timestamps (automatically added by @Schema({ timestamps: true }))
  createdAt?: Date;
  updatedAt?: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Create compound index for efficient participant lookups
ConversationSchema.index({ participant1: 1, participant2: 1 });
ConversationSchema.index({ participants: 1 });
