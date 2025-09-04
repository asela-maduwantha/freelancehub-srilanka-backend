import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class RelatedEntity {
  @Prop({ required: true })
  entityType: string;

  @Prop({ required: true, type: Types.ObjectId })
  entityId: Types.ObjectId;
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['message', 'proposal', 'payment', 'milestone', 'review'],
  })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: RelatedEntity })
  relatedEntity: RelatedEntity;

  @Prop({ default: 'medium', enum: ['low', 'medium', 'high', 'urgent'] })
  priority: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop()
  readAt: Date;

  createdAt?: Date;
}

export type NotificationDocument = Notification & Document;
export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Indexes
NotificationSchema.index({ userId: 1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ isRead: 1 });
NotificationSchema.index({ priority: 1 });
NotificationSchema.index({ createdAt: -1 });
