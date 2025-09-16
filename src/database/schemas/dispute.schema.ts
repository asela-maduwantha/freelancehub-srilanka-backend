import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { DisputeStatus } from '../../common/enums/dispute-status.enum';

@Schema({ _id: false })
export class DisputeEvidence {
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true, min: 0 })
  size: number;

  @Prop({ required: true })
  type: string;

  @Prop({ default: Date.now })
  uploadedAt: Date;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  uploadedBy: Types.ObjectId;
}

@Schema({
  timestamps: true,
  collection: 'disputes',
})
export class Dispute extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Contract' })
  contractId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Milestone' })
  milestoneId?: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  raisedBy: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  respondent: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['payment', 'quality', 'scope', 'deadline', 'other'],
  })
  type: string;

  @Prop({ required: true })
  reason: string;

  @Prop({ required: true })
  description: string;

  @Prop({ min: 0 })
  amount?: number;

  @Prop({ type: [DisputeEvidence], default: [] })
  evidence: DisputeEvidence[];

  @Prop({ required: true, enum: DisputeStatus, default: DisputeStatus.OPEN })
  status: DisputeStatus;

  @Prop()
  resolution?: string;

  @Prop()
  resolutionDetails?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  resolvedBy?: Types.ObjectId;

  @Prop()
  resolvedAt?: Date;

  @Prop()
  closedAt?: Date;

  @Prop()
  deletedAt?: Date;

  // Virtual fields
  get isOpen(): boolean {
    return this.status === DisputeStatus.OPEN;
  }

  get isResolved(): boolean {
    return this.status === DisputeStatus.RESOLVED;
  }

  get hasEvidence(): boolean {
    return this.evidence && this.evidence.length > 0;
  }

  get daysOpen(): number {
    const endDate = this.resolvedAt || this.closedAt || new Date();
    const startDate = (this as any).createdAt || new Date();
    return Math.floor(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
  }
}

export const DisputeSchema = SchemaFactory.createForClass(Dispute);

// Create indexes
DisputeSchema.index({ contractId: 1 });
DisputeSchema.index({ milestoneId: 1 }, { sparse: true });
DisputeSchema.index({ raisedBy: 1 });
DisputeSchema.index({ respondent: 1 });
DisputeSchema.index({ status: 1 });
DisputeSchema.index({ type: 1 });
DisputeSchema.index({ createdAt: -1 });
DisputeSchema.index({ status: 1, createdAt: -1 });
DisputeSchema.index({ deletedAt: 1 }, { sparse: true });

// Add virtual fields
DisputeSchema.virtual('isOpen').get(function () {
  return this.status === DisputeStatus.OPEN;
});

DisputeSchema.virtual('isResolved').get(function () {
  return this.status === DisputeStatus.RESOLVED;
});

DisputeSchema.virtual('hasEvidence').get(function () {
  return this.evidence && this.evidence.length > 0;
});

DisputeSchema.virtual('daysOpen').get(function () {
  const endDate = this.resolvedAt || this.closedAt || new Date();
  const startDate = (this as any).createdAt || new Date();
  return Math.floor(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
});

// Pre-save middleware
DisputeSchema.pre('save', function (next) {
  // Set resolved timestamp when status changes to resolved
  if (
    this.isModified('status') &&
    this.status === DisputeStatus.RESOLVED &&
    !this.resolvedAt
  ) {
    this.resolvedAt = new Date();
  }

  // Set closed timestamp when status changes to closed
  if (
    this.isModified('status') &&
    this.status === DisputeStatus.CLOSED &&
    !this.closedAt
  ) {
    this.closedAt = new Date();
  }

  next();
});

// Pre-find middleware to populate references
DisputeSchema.pre(/^find/, function (next) {
  // Populate will be handled at query level to avoid TypeScript issues
  next();
});

// Ensure virtuals are included in JSON
DisputeSchema.set('toJSON', { virtuals: true });
DisputeSchema.set('toObject', { virtuals: true });
