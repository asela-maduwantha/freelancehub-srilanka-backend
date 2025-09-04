import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class Deliverable {
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  url: string;

  @Prop({ default: Date.now })
  uploadedAt: Date;
}

@Schema({ _id: false })
export class ContractMilestone {
  _id: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  amount: number;

  @Prop()
  deadline: Date;

  @Prop({ default: 'pending', enum: ['pending', 'in_progress', 'submitted', 'approved', 'rejected'] })
  status: string;

  @Prop({ type: [Deliverable], default: [] })
  deliverables: Deliverable[];

  @Prop()
  feedback: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop()
  completedAt: Date;
}

@Schema({ timestamps: true })
export class Contract {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Project' })
  projectId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Proposal' })
  proposalId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  clientId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  freelancerId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ required: true, enum: ['fixed_price', 'hourly'] })
  contractType: string;

  @Prop()
  terms: string;

  @Prop({ type: [ContractMilestone], default: [] })
  milestones: ContractMilestone[];

  @Prop({ default: 'active', enum: ['active', 'completed', 'cancelled', 'disputed'] })
  status: string;

  @Prop()
  startDate: Date;

  @Prop()
  endDate: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export type ContractDocument = Contract & Document;
export const ContractSchema = SchemaFactory.createForClass(Contract);

// Indexes
ContractSchema.index({ projectId: 1 });
ContractSchema.index({ clientId: 1 });
ContractSchema.index({ freelancerId: 1 });
ContractSchema.index({ status: 1 });
ContractSchema.index({ createdAt: -1 });