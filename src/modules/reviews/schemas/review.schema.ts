import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReviewDocument = Review & Document;

@Schema({ timestamps: true })
export class Review {
  @Prop({ type: String, ref: 'User', required: true })
  reviewerId: string; // User who is giving the review

  @Prop({ type: String, ref: 'User', required: true })
  revieweeId: string; // User who is being reviewed

  @Prop({ type: String, ref: 'Project', required: true })
  projectId: string;

  @Prop({
    required: true,
    min: 1,
    max: 5
  })
  rating: number;

  @Prop({ required: true })
  review: string;

  @Prop({
    type: String,
    enum: ['freelancer', 'client'],
    required: true
  })
  reviewType: string; // Whether this is a review for freelancer or client

  @Prop({
    type: [{
      category: String,
      rating: { type: Number, min: 1, max: 5 }
    }]
  })
  criteria: {
    category: string;
    rating: number;
  }[];

  @Prop({
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  })
  visibility: string;

  @Prop({
    type: String,
    enum: ['pending', 'published', 'hidden'],
    default: 'pending'
  })
  status: string;

  @Prop()
  response: string; // Reviewee's response to the review

  @Prop()
  responseDate: Date;

  @Prop({ type: [String], default: [] })
  helpful: string[]; // User IDs who found this review helpful

  @Prop({ type: [String], default: [] })
  reported: string[]; // User IDs who reported this review

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
