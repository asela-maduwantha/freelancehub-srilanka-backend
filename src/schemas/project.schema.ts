import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class Budget {
  @Prop({ required: true, enum: ['fixed', 'range'] })
  type: string;

  @Prop()
  amount: number;

  @Prop()
  minAmount: number;

  @Prop()
  maxAmount: number;

  @Prop({ default: 'USD' })
  currency: string;
}

@Schema({ _id: false })
export class Duration {
  @Prop()
  estimated: number; // in days

  @Prop()
  deadline: Date;
}

@Schema({ _id: false })
export class Attachment {
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  size: number;

  @Prop({ default: Date.now })
  uploadedAt: Date;
}

@Schema({ timestamps: true })
export class Project {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  clientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  freelancerId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  category: string;

  @Prop({ type: [String], required: true })
  requiredSkills: string[];

  @Prop({ required: true, enum: ['fixed_price', 'hourly'] })
  projectType: string;

  @Prop({ required: true, enum: ['fixed', 'hourly'] })
  budgetType: string;

  @Prop({ type: Budget, required: true })
  budget: Budget;

  @Prop({ type: Duration })
  duration: Duration;

  @Prop({ type: [Attachment], default: [] })
  attachments: Attachment[];

  @Prop({ default: 'public', enum: ['public', 'invite_only'] })
  visibility: string;

  @Prop({ default: 'draft', enum: ['draft', 'active', 'closed', 'completed', 'cancelled'] })
  status: string;

  @Prop({ default: 0 })
  proposalCount: number;

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  publishedAt: Date;

  @Prop()
  closedAt: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export type ProjectDocument = Project & Document;
export const ProjectSchema = SchemaFactory.createForClass(Project);

// Indexes
ProjectSchema.index({ clientId: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ category: 1 });
ProjectSchema.index({ requiredSkills: 1 });
ProjectSchema.index({ createdAt: -1 });
ProjectSchema.index({ publishedAt: -1 });
