import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class RequiredSkill {
  @Prop({ required: true })
  skill: string;

  @Prop({ default: 'intermediate' })
  level: string;
}

@Schema({ timestamps: true })
export class Project {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  clientId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  category: string;

  @Prop()
  subcategory: string;

  @Prop({ type: [RequiredSkill], required: true })
  requiredSkills: RequiredSkill[];

  @Prop({ required: true, enum: ['fixed', 'hourly'] })
  budgetType: string;

  @Prop({ required: true })
  budget: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ enum: ['short-term', 'long-term', 'ongoing'] })
  duration: string;

  @Prop()
  deadline: Date;

  @Prop({ type: [String], default: ['remote'] })
  workType: string[];

  @Prop({ enum: ['basic', 'standard', 'premium'] })
  experienceLevel: string;

  @Prop({ default: 'public', enum: ['public', 'private'] })
  visibility: string;

  @Prop({
    default: 'open',
    enum: ['open', 'in_progress', 'completed', 'cancelled'],
  })
  status: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Object, default: { views: 0, applications: 0, saves: 0 } })
  analytics: {
    views: number;
    applications: number;
    saves: number;
  };

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
ProjectSchema.index({ 'requiredSkills.skill': 1 });
ProjectSchema.index({ budgetType: 1 });
ProjectSchema.index({ budget: 1 });
ProjectSchema.index({ deadline: 1 });
ProjectSchema.index({ createdAt: -1 });
ProjectSchema.index({ publishedAt: -1 });
