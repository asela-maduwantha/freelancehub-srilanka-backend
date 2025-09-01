import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProjectDocument = Project & Document;

@Schema({ timestamps: true })
export class Project {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  category?: string;

  @Prop()
  subcategory?: string;

  @Prop({ type: String, ref: 'User', required: true })
  clientId: string;

  @Prop({ type: String, ref: 'User' })
  freelancerId: string;

  @Prop({
    type: String,
    enum: ['open', 'in-progress', 'completed', 'cancelled', 'disputed'],
    default: 'open'
  })
  status: string;

  @Prop({
    type: [{
      skill: String,
      level: { type: String, enum: ['beginner', 'intermediate', 'expert'] }
    }]
  })
  requiredSkills: {
    skill: string;
    level: string;
  }[];

  @Prop({
    type: String,
    enum: ['fixed', 'hourly'],
    required: true
  })
  budgetType: string;

  @Prop({ required: true })
  budget: number;

  @Prop()
  minBudget?: number;

  @Prop()
  maxBudget?: number;

  @Prop({
    type: String,
    enum: ['short-term', 'long-term', 'ongoing'],
    default: 'short-term'
  })
  duration: string;

  @Prop()
  deadline?: Date;

  @Prop({
    type: [{
      type: String,
      enum: ['remote', 'onsite', 'hybrid']
    }],
    default: ['remote']
  })
  workType: string[];

  @Prop({
    type: String,
    enum: ['basic', 'standard', 'premium']
  })
  experienceLevel: string;

  @Prop({
    type: [{
      title: String,
      description: String,
      attachments: [String],
      submittedAt: { type: Date, default: Date.now }
    }]
  })
  milestones: {
    title: string;
    description: string;
    attachments: string[];
    submittedAt: Date;
  }[];

  @Prop({
    type: {
      contractId: String,
      startDate: Date,
      endDate: Date,
      agreedAmount: Number,
      paymentTerms: String
    }
  })
  contract?: {
    contractId: string;
    startDate: Date;
    endDate: Date;
    agreedAmount: number;
    paymentTerms: string;
  };

  @Prop({
    type: [{
      amount: Number,
      status: {
        type: String,
        enum: ['pending', 'released', 'held', 'refunded'],
        default: 'pending'
      },
      releaseDate: Date,
      description: String,
      milestoneId: String
    }]
  })
  payments: {
    amount: number;
    status: string;
    releaseDate: Date;
    description: string;
    milestoneId: string;
  }[];

  @Prop({
    type: [{
      userId: { type: String, ref: 'User' },
      message: String,
      attachments: [String],
      timestamp: { type: Date, default: Date.now }
    }]
  })
  messages: {
    userId: string;
    message: string;
    attachments: string[];
    timestamp: Date;
  }[];

  @Prop({
    type: [{
      userId: { type: String, ref: 'User' },
      rating: { type: Number, min: 1, max: 5 },
      review: String,
      createdAt: { type: Date, default: Date.now }
    }]
  })
  reviews: {
    userId: string;
    rating: number;
    review: string;
    createdAt: Date;
  }[];

  @Prop({
    type: [{
      userId: { type: String, ref: 'User' },
      reason: String,
      description: String,
      status: {
        type: String,
        enum: ['open', 'resolved', 'closed'],
        default: 'open'
      },
      createdAt: { type: Date, default: Date.now },
      resolvedAt: Date
    }]
  })
  disputes: {
    userId: string;
    reason: string;
    description: string;
    status: string;
    createdAt: Date;
    resolvedAt: Date;
  }[];

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: [String], default: [] })
  attachments: string[];

  @Prop({
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  })
  visibility: string;

  @Prop({
    type: {
      views: { type: Number, default: 0 },
      applications: { type: Number, default: 0 },
      saves: { type: Number, default: 0 }
    }
  })
  analytics: {
    views: number;
    applications: number;
    saves: number;
  };

  @Prop({ type: Date, default: Date.now })
  postedAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
