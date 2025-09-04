import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class ProposedBudget {
  @Prop({ required: true })
  amount: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ required: true, enum: ['fixed', 'hourly'] })
  type: string;
}

@Schema({ _id: false })
export class Timeline {
  @Prop()
  estimatedDuration: number;

  @Prop()
  proposedDeadline: Date;
}

@Schema({ _id: false })
export class ProposedDuration {
  @Prop({ required: true })
  value: number;

  @Prop({ required: true, enum: ['days', 'weeks', 'months'] })
  unit: string;
}

@Schema({ _id: false })
export class ProposalAttachment {
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  url: string;

  @Prop()
  description: string;
}

@Schema({ _id: false })
export class Milestone {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  durationDays: number;

  @Prop()
  deliveryDate: Date;
}

@Schema({ timestamps: true })
export class Proposal {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Project' })
  projectId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  freelancerId: Types.ObjectId;

  @Prop({ required: true })
  coverLetter: string;

  @Prop({ type: ProposedBudget, required: true })
  proposedBudget: ProposedBudget;

  @Prop({ type: ProposedDuration })
  proposedDuration: ProposedDuration;

  @Prop({ type: Timeline })
  timeline: Timeline;

  @Prop({ type: [ProposalAttachment], default: [] })
  attachments: ProposalAttachment[];

  @Prop({ type: [Milestone], default: [] })
  milestones: Milestone[];

  @Prop({
    default: 'submitted',
    enum: ['submitted', 'shortlisted', 'accepted', 'rejected', 'withdrawn'],
  })
  status: string;

  @Prop({ default: Date.now })
  submittedAt: Date;

  @Prop()
  respondedAt: Date;

  @Prop({ default: false })
  clientViewed: boolean;

  @Prop()
  clientViewedAt: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export type ProposalDocument = Proposal & Document;
export const ProposalSchema = SchemaFactory.createForClass(Proposal);

// Indexes
ProposalSchema.index({ projectId: 1 });
ProposalSchema.index({ freelancerId: 1 });
ProposalSchema.index({ status: 1 });
ProposalSchema.index({ submittedAt: -1 });
