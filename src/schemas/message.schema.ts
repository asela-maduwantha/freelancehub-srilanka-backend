import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class MessageAttachment {
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true })
  mimeType: string;
}

@Schema({ timestamps: true })
export class Message {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Conversation' })
  conversationId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  senderId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  receiverId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  recipientId: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop()
  encryptedContent: string;

  @Prop()
  iv: string;

  @Prop()
  messageHash: string;

  @Prop({ default: 'text', enum: ['text', 'file', 'system'] })
  messageType: string;

  @Prop({ type: [MessageAttachment], default: [] })
  attachments: MessageAttachment[];

  @Prop({ default: false })
  isRead: boolean;

  @Prop()
  readAt: Date;

  @Prop({ default: 'sent', enum: ['sent', 'delivered', 'read', 'failed'] })
  status: string;

  @Prop()
  deliveredAt: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export type MessageDocument = Message & Document;
export const MessageSchema = SchemaFactory.createForClass(Message);

// Indexes
MessageSchema.index({ conversationId: 1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ receiverId: 1 });
MessageSchema.index({ isRead: 1 });
MessageSchema.index({ createdAt: -1 });
