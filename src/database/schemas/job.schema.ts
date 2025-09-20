import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { JobStatus } from '../../common/enums/job-status.enum';

// Budget Sub-schema
@Schema({ _id: false })
export class Budget {
  @Prop({ required: true, enum: ['fixed', 'hourly', 'range'] })
  type: string;

  @Prop({ required: true, min: 0 })
  min: number;

  @Prop({ min: 0 })
  max?: number;

  @Prop({ default: 'USD' })
  currency: string;
}

// Duration Sub-schema
@Schema({ _id: false })
export class Duration {
  @Prop({ required: true, min: 1 })
  value: number;

  @Prop({ required: true, enum: ['days', 'weeks', 'months'] })
  unit: string;
}

// Attachment Sub-schema
@Schema({ _id: false })
export class Attachment {
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true, min: 0 })
  size: number;

  @Prop({ required: true })
  type: string;
}

// Main Job Schema
@Schema({
  timestamps: true,
  collection: 'jobs',
})
export class Job extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  clientId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  category: string;

  @Prop()
  subcategory?: string;

  @Prop({ required: true, enum: ['fixed-price', 'hourly'] })
  projectType: string;

  @Prop({ required: true, type: Budget })
  budget: Budget;

  @Prop({ type: Duration })
  duration?: Duration;

  @Prop({ required: true, type: [String] })
  skills: string[];

  @Prop({ enum: ['beginner', 'intermediate', 'expert'] })
  experienceLevel?: string;

  @Prop({ required: true, enum: JobStatus, default: JobStatus.DRAFT })
  status: JobStatus;

  @Prop({ default: false })
  isUrgent: boolean;

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop({ type: [Attachment], default: [] })
  attachments: Attachment[];

  @Prop({ default: 0, min: 0 })
  proposalCount: number;

  @Prop({ min: 1 })
  maxProposals?: number;

  @Prop({ type: Types.ObjectId, ref: 'Proposal' })
  selectedProposalId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Contract' })
  contractId?: Types.ObjectId;

  @Prop({ default: Date.now })
  postedAt: Date;

  @Prop()
  expiresAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  deletedAt?: Date;

  // Virtual fields
  get isActive(): boolean {
    return this.status === JobStatus.OPEN && !this.deletedAt;
  }

  get isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  get canReceiveProposals(): boolean {
    return (
      this.isActive &&
      !this.isExpired &&
      (!this.maxProposals || this.proposalCount < this.maxProposals)
    );
  }
}

export const JobSchema = SchemaFactory.createForClass(Job);

// Create indexes
JobSchema.index({ clientId: 1 });
JobSchema.index({ status: 1 });
JobSchema.index({ category: 1 });
JobSchema.index({ skills: 1 });
JobSchema.index({ 'budget.min': 1, 'budget.max': 1 });
JobSchema.index({ postedAt: -1 });
JobSchema.index({
  isUrgent: -1,
  isFeatured: -1,
  postedAt: -1,
});
JobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
JobSchema.index({ 'location.countries': 1 });
JobSchema.index({ deletedAt: 1 }, { sparse: true });

// Text search index
JobSchema.index(
  {
    title: 'text',
    description: 'text',
    skills: 'text',
  },
  {
    weights: {
      title: 10,
      skills: 5,
      description: 1,
    },
  },
);

// Add virtual fields
JobSchema.virtual('isActive').get(function () {
  return this.status === JobStatus.OPEN && !this.deletedAt;
});

JobSchema.virtual('isExpired').get(function () {
  return this.expiresAt ? new Date() > this.expiresAt : false;
});

JobSchema.virtual('canReceiveProposals').get(function () {
  return (
    this.isActive &&
    !this.isExpired &&
    (!this.maxProposals || this.proposalCount < this.maxProposals)
  );
});



// Ensure virtuals are included in JSON
JobSchema.set('toJSON', { virtuals: true });
JobSchema.set('toObject', { virtuals: true });
