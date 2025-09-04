import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Review {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Contract' })
  contractId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  reviewerId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  revieweeId: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ required: true })
  comment: string;

  @Prop({ required: true, enum: ['freelancer_to_client', 'client_to_freelancer'] })
  reviewType: string;

  @Prop({ default: false })
  isPublic: boolean;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  helpful: Types.ObjectId[];

  createdAt?: Date;
  updatedAt?: Date;
}

export type ReviewDocument = Review & Document;
export const ReviewSchema = SchemaFactory.createForClass(Review);

// Indexes
ReviewSchema.index({ contractId: 1 });
ReviewSchema.index({ reviewerId: 1 });
ReviewSchema.index({ revieweeId: 1 });
ReviewSchema.index({ reviewType: 1 });
ReviewSchema.index({ createdAt: -1 });