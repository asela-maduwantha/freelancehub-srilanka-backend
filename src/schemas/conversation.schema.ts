import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class LastMessage {
  @Prop({ required: true })
  content: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  senderId: Types.ObjectId;

  @Prop({ default: Date.now })
  timestamp: Date;
}

@Schema({ _id: false })
export class UnreadCount {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ default: 0 })
  count: number;
}

@Schema({ timestamps: true })
export class Conversation {
  @Prop()
  conversationId: string;

  @Prop({ type: [Types.ObjectId], ref: 'User', required: true })
  participants: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  participant1: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  participant2: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project' })
  projectId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Contract' })
  contractId: Types.ObjectId;

  @Prop({ type: LastMessage })
  lastMessage: LastMessage;

  @Prop()
  lastMessageAt: Date;

  @Prop()
  lastMessagePreview: string;

  @Prop({ type: [UnreadCount], default: [] })
  unreadCount: UnreadCount[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Object })
  metadata: any;

  createdAt?: Date;
  updatedAt?: Date;
}

export type ConversationDocument = Conversation & Document;
export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Indexes
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ projectId: 1 });
ConversationSchema.index({ contractId: 1 });
ConversationSchema.index({ isActive: 1 });
ConversationSchema.index({ updatedAt: -1 });
