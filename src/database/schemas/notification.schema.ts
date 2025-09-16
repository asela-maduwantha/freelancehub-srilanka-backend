// src/database/schemas/notification.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { NotificationType } from '../../common/enums/notification-type.enum';

@Schema({
  timestamps: true,
  collection: 'notifications',
})
export class Notification extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: NotificationType })
  type: NotificationType;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: Types.ObjectId })
  relatedId?: Types.ObjectId;

  @Prop({
    enum: [
      'job',
      'proposal',
      'contract',
      'milestone',
      'payment',
      'user',
      'dispute',
      'review',
    ],
  })
  relatedType?: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ default: false })
  isEmailSent: boolean;

  @Prop()
  readAt?: Date;

  @Prop()
  deletedAt?: Date;

  // Virtual fields
  get isUnread(): boolean {
    return !this.isRead;
  }

  get age(): number {
    return Date.now() - (this as any).createdAt.getTime();
  }

  get ageInHours(): number {
    return Math.floor(this.age / (1000 * 60 * 60));
  }
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Create indexes
NotificationSchema.index({ userId: 1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ isRead: 1 });
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ deletedAt: 1 }, { sparse: true });
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, type: 1 });

// Add virtual fields
NotificationSchema.virtual('isUnread').get(function () {
  return !this.isRead;
});

NotificationSchema.virtual('age').get(function () {
  return Date.now() - (this as any).createdAt.getTime();
});

NotificationSchema.virtual('ageInHours').get(function () {
  return Math.floor(this.age / (1000 * 60 * 60));
});

// Pre-save middleware
NotificationSchema.pre('save', function (next) {
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  next();
});

// Ensure virtuals are included in JSON
NotificationSchema.set('toJSON', { virtuals: true });
NotificationSchema.set('toObject', { virtuals: true });
