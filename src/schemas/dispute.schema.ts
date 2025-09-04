import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class Evidence {
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  url: string;

  @Prop()
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  uploadedBy: Types.ObjectId;

  @Prop({ default: Date.now })
  uploadedAt: Date;

  @Prop({ type: [String], default: [] })
  files: string[];
}

@Schema({ _id: false })
export class DisputeMessage {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  senderId: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: Date.now })
  timestamp: Date;
}

@Schema({ _id: false })
export class Resolution {
  @Prop({ required: true })
  decision: string;

  @Prop()
  explanation: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  resolvedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  decidedBy: Types.ObjectId;

  @Prop({ default: 0 })
  refundAmount: number;

  @Prop({ default: Date.now })
  resolvedAt: Date;
}

@Schema({ timestamps: true })
export class Dispute {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Contract' })
  contractId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  initiatorId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  respondentId: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['payment', 'quality', 'communication', 'other'],
  })
  type: string;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [Evidence], default: [] })
  evidence: Evidence[];

  @Prop({ type: [DisputeMessage], default: [] })
  messages: DisputeMessage[];

  @Prop({
    default: 'open',
    enum: ['open', 'in_review', 'resolved', 'escalated'],
  })
  status: string;

  @Prop({ type: Resolution })
  resolution: Resolution;

  createdAt?: Date;
  updatedAt?: Date;
}

export type DisputeDocument = Dispute & Document;
export const DisputeSchema = SchemaFactory.createForClass(Dispute);

// Indexes
DisputeSchema.index({ contractId: 1 });
DisputeSchema.index({ initiatorId: 1 });
DisputeSchema.index({ respondentId: 1 });
DisputeSchema.index({ type: 1 });
DisputeSchema.index({ status: 1 });
DisputeSchema.index({ createdAt: -1 });
