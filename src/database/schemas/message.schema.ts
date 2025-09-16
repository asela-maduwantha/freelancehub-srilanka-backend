// =============================================================================

// src/database/schemas/message.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Message Attachment Sub-schema
@Schema({ _id: false })
export class MessageAttachment {
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true, min: 0 })
  size: number;

  @Prop({ required: true })
  type: string;
}

@Schema({
  timestamps: true,
  collection: 'messages',
})
export class Message extends Document {
  @Prop({ required: true })
  conversationId: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  senderId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  receiverId: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true, enum: ['text', 'file', 'system'], default: 'text' })
  messageType: string;

  @Prop({ type: [MessageAttachment], default: [] })
  attachments: MessageAttachment[];

  @Prop({ type: Types.ObjectId })
  relatedId?: Types.ObjectId;

  @Prop({ enum: ['job', 'contract', 'proposal'] })
  relatedType?: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ default: false })
  isEdited: boolean;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: Date.now })
  sentAt: Date;

  @Prop()
  readAt?: Date;

  @Prop()
  editedAt?: Date;

  @Prop()
  deletedAt?: Date;

  // Virtual fields
  get isUnread(): boolean {
    return !this.isRead;
  }

  get hasAttachments(): boolean {
    return this.attachments && this.attachments.length > 0;
  }

  get isSystemMessage(): boolean {
    return this.messageType === 'system';
  }
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Create indexes
MessageSchema.index({ conversationId: 1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ receiverId: 1 });
MessageSchema.index({ sentAt: -1 });
MessageSchema.index({ conversationId: 1, sentAt: -1 });
MessageSchema.index({ receiverId: 1, isRead: 1 });
MessageSchema.index({ isDeleted: 1 });

// Add virtual fields
MessageSchema.virtual('isUnread').get(function () {
  return !this.isRead;
});

MessageSchema.virtual('hasAttachments').get(function () {
  return this.attachments && this.attachments.length > 0;
});

MessageSchema.virtual('isSystemMessage').get(function () {
  return this.messageType === 'system';
});

// Pre-save middleware
MessageSchema.pre('save', function (next) {
  // Set read timestamp when message is marked as read
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }

  // Set edited timestamp when message is edited
  if (this.isModified('content') && !this.isNew && !this.editedAt) {
    this.isEdited = true;
    this.editedAt = new Date();
  }

  next();
});

// Pre-find middleware to populate references
MessageSchema.pre(/^find/, function (next) {
  // Populate will be handled at query level to avoid TypeScript issues
  next();
});

// Ensure virtuals are included in JSON
MessageSchema.set('toJSON', { virtuals: true });
MessageSchema.set('toObject', { virtuals: true });
