import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'conversations',
})
export class Conversation extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Contract' })
  contractId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Milestone' })
  milestoneId?: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  clientId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  freelancerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Message' })
  lastMessageId?: Types.ObjectId;

  @Prop()
  lastMessageAt?: Date;

  @Prop({ default: 0, min: 0 })
  unreadCountClient: number;

  @Prop({ default: 0, min: 0 })
  unreadCountFreelancer: number;

  @Prop({ default: false })
  isArchivedByClient: boolean;

  @Prop({ default: false })
  isArchivedByFreelancer: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  deletedAt?: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Create indexes for efficient queries
ConversationSchema.index({ contractId: 1 });
ConversationSchema.index({ milestoneId: 1 }, { sparse: true });
ConversationSchema.index({ clientId: 1 });
ConversationSchema.index({ freelancerId: 1 });
ConversationSchema.index({ lastMessageAt: -1 });
ConversationSchema.index({ isActive: 1 });
ConversationSchema.index({ deletedAt: 1 }, { sparse: true });

// Compound indexes for common queries
ConversationSchema.index({ contractId: 1, milestoneId: 1 });
ConversationSchema.index({ clientId: 1, isActive: 1, lastMessageAt: -1 });
ConversationSchema.index({ freelancerId: 1, isActive: 1, lastMessageAt: -1 });

// Ensure unique conversation per contract-milestone combination
ConversationSchema.index(
  { contractId: 1, milestoneId: 1 },
  { unique: true, partialFilterExpression: { milestoneId: { $exists: true } } }
);

ConversationSchema.index(
  { contractId: 1 },
  { unique: true, partialFilterExpression: { milestoneId: { $exists: false } } }
);

// Virtual fields
ConversationSchema.virtual('hasUnreadMessages').get(function () {
  return this.unreadCountClient > 0 || this.unreadCountFreelancer > 0;
});

// Methods to get unread count for specific user
ConversationSchema.methods.getUnreadCount = function (userId: string) {
  if (this.clientId.toString() === userId) {
    return this.unreadCountClient;
  } else if (this.freelancerId.toString() === userId) {
    return this.unreadCountFreelancer;
  }
  return 0;
};

// Methods to increment unread count
ConversationSchema.methods.incrementUnread = function (userId: string) {
  if (this.clientId.toString() === userId) {
    this.unreadCountClient++;
  } else if (this.freelancerId.toString() === userId) {
    this.unreadCountFreelancer++;
  }
};

// Methods to reset unread count
ConversationSchema.methods.resetUnread = function (userId: string) {
  if (this.clientId.toString() === userId) {
    this.unreadCountClient = 0;
  } else if (this.freelancerId.toString() === userId) {
    this.unreadCountFreelancer = 0;
  }
};

// Ensure virtuals are included in JSON
ConversationSchema.set('toJSON', { virtuals: true });
ConversationSchema.set('toObject', { virtuals: true });
