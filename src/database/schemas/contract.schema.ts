import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ContractStatus } from '../../common/enums/contract-status.enum';

// Main Contract Schema
@Schema({
  timestamps: true,
  collection: 'contracts',
})
export class Contract extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Job' })
  jobId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  clientId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  freelancerId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Proposal' })
  proposalId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: ['fixed-price', 'hourly'] })
  contractType: string;

  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ min: 0 })
  hourlyRate?: number;

  @Prop({ required: true })
  startDate: Date;

  @Prop()
  endDate?: Date;

  @Prop({ min: 1 })
  estimatedHours?: number;

  @Prop({
    required: true,
    enum: ContractStatus,
    default: ContractStatus.ACTIVE,
  })
  status: ContractStatus;

  @Prop({ default: 0, min: 0 })
  totalPaid: number;

  @Prop({ default: 10, min: 0, max: 20 })
  platformFeePercentage: number;

  @Prop({ default: 0, min: 0 })
  milestoneCount: number;

  @Prop({ default: 0, min: 0 })
  completedMilestones: number;

  @Prop()
  terms?: string;

  @Prop()
  completedAt?: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop()
  deletedAt?: Date;

  // Virtual fields
  get remainingAmount(): number {
    return Math.max(0, this.totalAmount - this.totalPaid);
  }

  get completionPercentage(): number {
    if (this.milestoneCount === 0) return 0;
    return (this.completedMilestones / this.milestoneCount) * 100;
  }

  get isActive(): boolean {
    return this.status === ContractStatus.ACTIVE && !this.deletedAt;
  }

  get isCompleted(): boolean {
    return this.status === ContractStatus.COMPLETED;
  }

  get platformFee(): number {
    return (this.totalAmount * this.platformFeePercentage) / 100;
  }

  get freelancerAmount(): number {
    return this.totalAmount - this.platformFee;
  }
}

export const ContractSchema = SchemaFactory.createForClass(Contract);

// Create indexes
ContractSchema.index({ clientId: 1 });
ContractSchema.index({ freelancerId: 1 });
ContractSchema.index({ jobId: 1 });
ContractSchema.index({ proposalId: 1 });
ContractSchema.index({ status: 1 });
ContractSchema.index({ createdAt: -1 });
ContractSchema.index({ startDate: 1 });
ContractSchema.index({ endDate: 1 });
ContractSchema.index({ deletedAt: 1 }, { sparse: true });

// Compound indexes
ContractSchema.index({ clientId: 1, status: 1 });
ContractSchema.index({ freelancerId: 1, status: 1 });
ContractSchema.index({ status: 1, createdAt: -1 });

// Add virtual fields
ContractSchema.virtual('remainingAmount').get(function () {
  return Math.max(0, this.totalAmount - this.totalPaid);
});

ContractSchema.virtual('completionPercentage').get(function () {
  if (this.milestoneCount === 0) return 0;
  return (this.completedMilestones / this.milestoneCount) * 100;
});

ContractSchema.virtual('isActive').get(function () {
  return this.status === ContractStatus.ACTIVE && !this.deletedAt;
});

ContractSchema.virtual('isCompleted').get(function () {
  return this.status === ContractStatus.COMPLETED;
});

ContractSchema.virtual('platformFee').get(function () {
  return (this.totalAmount * this.platformFeePercentage) / 100;
});

ContractSchema.virtual('freelancerAmount').get(function () {
  return this.totalAmount - this.platformFee;
});

// Pre-save middleware
ContractSchema.pre('save', function (next) {
  // Set completion date when status changes to completed
  if (
    this.isModified('status') &&
    this.status === ContractStatus.COMPLETED &&
    !this.completedAt
  ) {
    this.completedAt = new Date();
  }

  // Set cancellation date when status changes to cancelled
  if (
    this.isModified('status') &&
    this.status === ContractStatus.CANCELLED &&
    !this.cancelledAt
  ) {
    this.cancelledAt = new Date();
  }

  next();
});

// Pre-find middleware to populate references
ContractSchema.pre(/^find/, function (next) {
  // Populate will be handled at query level to avoid TypeScript issues
  next();
});

// Ensure virtuals are included in JSON
ContractSchema.set('toJSON', { virtuals: true });
ContractSchema.set('toObject', { virtuals: true });
