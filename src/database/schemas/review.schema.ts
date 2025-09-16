import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class ReviewCategories {
  @Prop({ min: 1, max: 5 })
  communication?: number;

  @Prop({ min: 1, max: 5 })
  quality?: number;

  @Prop({ min: 1, max: 5 })
  deadlines?: number;

  @Prop({ min: 1, max: 5 })
  professionalism?: number;
}

@Schema({
  timestamps: true,
  collection: 'reviews',
})
export class Review extends Document {
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

  @Prop({ type: ReviewCategories })
  categories?: ReviewCategories;

  @Prop({ default: true })
  isPublic: boolean;

  @Prop()
  response?: string;

  @Prop()
  respondedAt?: Date;

  @Prop()
  deletedAt?: Date;

  // Virtual fields
  get averageCategoryRating(): number {
    if (!this.categories) return this.rating;

    const ratings = [
      this.categories.communication,
      this.categories.quality,
      this.categories.deadlines,
      this.categories.professionalism,
    ].filter((rating) => rating !== undefined);

    return ratings.length > 0
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      : this.rating;
  }

  get hasResponse(): boolean {
    return !!this.response;
  }
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// Create indexes
ReviewSchema.index({ contractId: 1 });
ReviewSchema.index({ reviewerId: 1 });
ReviewSchema.index({ revieweeId: 1 });
ReviewSchema.index({ rating: 1 });
ReviewSchema.index({ createdAt: -1 });
ReviewSchema.index({ revieweeId: 1, isPublic: 1, createdAt: -1 });
ReviewSchema.index({ deletedAt: 1 }, { sparse: true });

// Add virtual fields
ReviewSchema.virtual('averageCategoryRating').get(function () {
  if (!this.categories) return this.rating;

  const ratings = [
    this.categories.communication,
    this.categories.quality,
    this.categories.deadlines,
    this.categories.professionalism,
  ].filter((rating) => rating !== undefined);

  return ratings.length > 0
    ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
    : this.rating;
});

ReviewSchema.virtual('hasResponse').get(function () {
  return !!this.response;
});

// Pre-save middleware
ReviewSchema.pre('save', function (next) {
  // Set responded timestamp when response is added
  if (this.isModified('response') && this.response && !this.respondedAt) {
    this.respondedAt = new Date();
  }
  next();
});

// Pre-find middleware to populate references
ReviewSchema.pre(/^find/, function (next) {
  // Populate will be handled at query level to avoid TypeScript issues
  next();
});

// Ensure virtuals are included in JSON
ReviewSchema.set('toJSON', { virtuals: true });
ReviewSchema.set('toObject', { virtuals: true });
