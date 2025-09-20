import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MilestoneStatus } from '../../common/enums/milestone-status.enum';

@Schema({ _id: false })
export class Deliverable {
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
}

@Schema({
  timestamps: true,
  collection: 'milestones',
})
export class Milestone extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Contract' })
  contractId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ required: true, min: 1 })
  order: number;

  @Prop()
  dueDate?: Date;

  @Prop({
    required: true,
    enum: MilestoneStatus,
    default: MilestoneStatus.PENDING,
  })
  status: MilestoneStatus;

  @Prop({ type: [Deliverable], default: [] })
  deliverables: Deliverable[];

  @Prop()
  submissionNote?: string;

  @Prop()
  clientFeedback?: string;

  @Prop({ type: Types.ObjectId, ref: 'Payment' })
  paymentId?: Types.ObjectId;

  @Prop()
  submittedAt?: Date;

  @Prop()
  approvedAt?: Date;

  @Prop()
  rejectedAt?: Date;

  @Prop()
  paidAt?: Date;

  @Prop()
  deletedAt?: Date;
}

export const MilestoneSchema = SchemaFactory.createForClass(Milestone);

// Create indexes
MilestoneSchema.index({ contractId: 1 });
MilestoneSchema.index({ status: 1 });
MilestoneSchema.index({ dueDate: 1 });
MilestoneSchema.index({ order: 1 });
MilestoneSchema.index({ paymentId: 1 }, { sparse: true });
MilestoneSchema.index({ deletedAt: 1 }, { sparse: true });

MilestoneSchema.index({ contractId: 1, order: 1 });
MilestoneSchema.index({ contractId: 1, status: 1 });
MilestoneSchema.index({ status: 1, dueDate: 1 });

MilestoneSchema.virtual('isOverdue').get(function () {
  return (
    this.dueDate &&
    new Date() > this.dueDate &&
    ![MilestoneStatus.APPROVED, MilestoneStatus.PAID].includes(this.status)
  );
});

MilestoneSchema.virtual('daysUntilDue').get(function () {
  if (!this.dueDate) return 0;
  const diff = this.dueDate.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

MilestoneSchema.virtual('hasDeliverables').get(function () {
  return this.deliverables && this.deliverables.length > 0;
});

MilestoneSchema.virtual('isPending').get(function () {
  return this.status === MilestoneStatus.PENDING;
});

MilestoneSchema.virtual('isInProgress').get(function () {
  return this.status === MilestoneStatus.IN_PROGRESS;
});

MilestoneSchema.virtual('isSubmitted').get(function () {
  return this.status === MilestoneStatus.SUBMITTED;
});

MilestoneSchema.virtual('isApproved').get(function () {
  return this.status === MilestoneStatus.APPROVED;
});

MilestoneSchema.virtual('isRejected').get(function () {
  return this.status === MilestoneStatus.REJECTED;
});

MilestoneSchema.virtual('isPaid').get(function () {
  return this.status === MilestoneStatus.PAID;
});

MilestoneSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    const now = new Date();

    switch (this.status) {
      case MilestoneStatus.SUBMITTED:
        if (!this.submittedAt) this.submittedAt = now;
        break;
      case MilestoneStatus.APPROVED:
        if (!this.approvedAt) this.approvedAt = now;
        break;
      case MilestoneStatus.REJECTED:
        if (!this.rejectedAt) this.rejectedAt = now;
        break;
      case MilestoneStatus.PAID:
        if (!this.paidAt) this.paidAt = now;
        break;
    }
  }

  next();
});

MilestoneSchema.pre(/^find/, function (next) {
  next();
});

MilestoneSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc: any, ret: any) {
    delete ret._id;
    delete ret.__v;
    ret.id = doc._id;
    return ret;
  }
});

MilestoneSchema.set('toObject', {
  virtuals: true,
  transform: function(doc: any, ret: any) {
    delete ret._id;
    delete ret.__v;
    ret.id = doc._id;
    return ret;
  }
});
