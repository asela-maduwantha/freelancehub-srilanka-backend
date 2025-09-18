import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ProposalStatus } from '../../common/enums/proposal-status.enum';

// Proposed Rate Sub-schema
@Schema({ _id: false })
export class ProposedRate {
  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true, enum: ['fixed', 'hourly'] })
  type: string;

  @Prop({ default: 'USD' })
  currency: string;
}

// Estimated Duration Sub-schema
@Schema({ _id: false })
export class EstimatedDuration {
  @Prop({ required: true, min: 1 })
  value: number;

  @Prop({ required: true, enum: ['days', 'weeks', 'months'] })
  unit: string;
}

// Proposed Milestone Sub-schema
@Schema({ _id: true })
export class ProposedMilestone {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true, min: 1 })
  durationDays: number;
}


// Attachment Sub-schema (reused from job schema)
@Schema({ _id: false })
export class ProposalAttachment {
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true, min: 0 })
  size: number;

  @Prop({ required: true })
  type: string;
}

// Main Proposal Schema
@Schema({
  timestamps: true,
  collection: 'proposals',
})
export class Proposal extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Job' })
  jobId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  freelancerId: Types.ObjectId;

  @Prop({ required: true })
  coverLetter: string;

  @Prop({ required: true, type: ProposedRate })
  proposedRate: ProposedRate;

  @Prop({ type: EstimatedDuration })
  estimatedDuration?: EstimatedDuration;

  @Prop({ type: [ProposedMilestone], default: [] })
  proposedMilestones: ProposedMilestone[];

  @Prop({ type: [ProposalAttachment], default: [] })
  attachments: ProposalAttachment[];

  @Prop({
    required: true,
    enum: ProposalStatus,
    default: ProposalStatus.PENDING,
  })
  status: ProposalStatus;

  @Prop({ default: false })
  clientViewed: boolean;

  @Prop()
  clientViewedAt?: Date;

  @Prop({ default: Date.now })
  submittedAt: Date;

  @Prop()
  deletedAt?: Date;
}

export const ProposalSchema = SchemaFactory.createForClass(Proposal);

// Create indexes
ProposalSchema.index({ jobId: 1 });
ProposalSchema.index({ freelancerId: 1 });
ProposalSchema.index({ status: 1 });
ProposalSchema.index({ submittedAt: -1 });
ProposalSchema.index({ jobId: 1, status: 1 });
ProposalSchema.index({ freelancerId: 1, status: 1 });
ProposalSchema.index({ deletedAt: 1 }, { sparse: true });

// Compound index for job proposals with sorting
ProposalSchema.index({
  jobId: 1,
  status: 1,
  submittedAt: -1,
});

// Add virtual fields
ProposalSchema.virtual('isActive').get(function () {
  return this.status === ProposalStatus.PENDING && !this.deletedAt;
});

ProposalSchema.virtual('estimatedDurationInDays').get(function () {
  if (!this.estimatedDuration) return 0;

  const multipliers = { days: 1, weeks: 7, months: 30 };
  return (
    this.estimatedDuration.value * multipliers[this.estimatedDuration.unit]
  );
});


// Ensure virtuals are included in JSON
ProposalSchema.set('toJSON', { virtuals: false });
ProposalSchema.set('toObject', { virtuals: false });
