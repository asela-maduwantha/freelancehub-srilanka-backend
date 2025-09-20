import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ContractStatus } from '../../common/enums/contract-status.enum';

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
  isClientSigned?: boolean;

  @Prop()
  isFreelancerSigned?: boolean;

  @Prop()
  completedAt?: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop()
  deletedAt?: Date;
}

export const ContractSchema = SchemaFactory.createForClass(Contract);

ContractSchema.index({ clientId: 1 });
ContractSchema.index({ freelancerId: 1 });
ContractSchema.index({ jobId: 1 });
ContractSchema.index({ proposalId: 1 });
ContractSchema.index({ status: 1 });
ContractSchema.index({ createdAt: -1 });
ContractSchema.index({ startDate: 1 });
ContractSchema.index({ endDate: 1 });
ContractSchema.index({ deletedAt: 1 }, { sparse: true });

ContractSchema.index({ clientId: 1, status: 1 });
ContractSchema.index({ freelancerId: 1, status: 1 });
ContractSchema.index({ status: 1, createdAt: -1 });


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
  return this.totalAmount - ((this.totalAmount * this.platformFeePercentage) / 100);
});

ContractSchema.pre('save', function (next) {
  if (
    this.isModified('status') &&
    this.status === ContractStatus.COMPLETED &&
    !this.completedAt
  ) {
    this.completedAt = new Date();
  }

  if (
    this.isModified('status') &&
    this.status === ContractStatus.CANCELLED &&
    !this.cancelledAt
  ) {
    this.cancelledAt = new Date();
  }

  next();
});

ContractSchema.pre(/^find/, function (next) {
  next();
});

ContractSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    // Convert ObjectId fields to strings
    if (ret._id) (ret as any)._id = ret._id.toString();
    if (ret.jobId) (ret as any).jobId = ret.jobId.toString();
    if (ret.clientId) (ret as any).clientId = ret.clientId.toString();
    if (ret.freelancerId) (ret as any).freelancerId = ret.freelancerId.toString();
    if (ret.proposalId) (ret as any).proposalId = ret.proposalId.toString();
    return ret;
  }
});

ContractSchema.set('toObject', { 
  virtuals: true,
  transform: function(doc, ret) {
    // Convert ObjectId fields to strings
    if (ret._id) (ret as any)._id = ret._id.toString();
    if (ret.jobId) (ret as any).jobId = ret.jobId.toString();
    if (ret.clientId) (ret as any).clientId = ret.clientId.toString();
    if (ret.freelancerId) (ret as any).freelancerId = ret.freelancerId.toString();
    if (ret.proposalId) (ret as any).proposalId = ret.proposalId.toString();
    return ret;
  }
});

