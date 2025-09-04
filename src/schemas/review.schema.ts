import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class Ratings {
  @Prop({ required: true, min: 1, max: 5 })
  overall: number;

  @Prop({ required: true, min: 1, max: 5 })
  quality: number;

  @Prop({ required: true, min: 1, max: 5 })
  communication: number;

  @Prop({ required: true, min: 1, max: 5 })
  timeliness: number;

  @Prop({ required: true, min: 1, max: 5 })
  professionalism: number;
}

@Schema({ _id: false })
export class Response {
  @Prop({ required: true })
  content: string;

  @Prop({ default: Date.now })
  respondedAt: Date;
}

@Schema({ timestamps: true })
export class Review {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Contract' })
  contractId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  reviewerId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  revieweeId: Types.ObjectId;

  @Prop({ required: true, enum: ['client', 'freelancer'] })
  reviewerType: string;

  @Prop({ type: Ratings, required: true })
  ratings: Ratings;

  @Prop({ required: true })
  comment: string;

  @Prop({ default: true })
  isPublic: boolean;

  @Prop({ type: Response })
  response: Response;

  createdAt?: Date;
  updatedAt?: Date;
}

export type ReviewDocument = Review & Document;
export const ReviewSchema = SchemaFactory.createForClass(Review);

// Indexes
ReviewSchema.index({ contractId: 1 });
ReviewSchema.index({ reviewerId: 1 });
ReviewSchema.index({ revieweeId: 1 });
ReviewSchema.index({ reviewerType: 1 });
ReviewSchema.index({ isPublic: 1 });
ReviewSchema.index({ createdAt: -1 });
