import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PaymentStatus } from '../../common/enums/payment-status.enum';

// Main Payment Schema
@Schema({
  timestamps: true,
  collection: 'payments',
})
export class Payment extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Contract' })
  contractId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Milestone' })
  milestoneId?: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  payerId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  payeeId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ required: true, enum: ['milestone', 'hourly', 'bonus', 'refund'] })
  paymentType: string;

  @Prop()
  stripePaymentIntentId?: string;

  @Prop()
  stripeChargeId?: string;

  @Prop()
  stripeTransferId?: string;

  @Prop({ required: true, min: 0 })
  platformFee: number;

  @Prop({ min: 0, max: 100, default: 10 })
  platformFeePercentage: number;

  @Prop({ min: 0, default: 0 })
  stripeFee: number;

  @Prop({ required: true, min: 0 })
  freelancerAmount: number;

  @Prop({ required: true, enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Prop()
  description?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop()
  processedAt?: Date;

  @Prop()
  failedAt?: Date;

  @Prop()
  refundedAt?: Date;

  @Prop()
  errorMessage?: string;

  @Prop({ default: 0, min: 0 })
  retryCount: number;

  @Prop()
  deletedAt?: Date;

  // Virtual fields
  get isPending(): boolean {
    return this.status === PaymentStatus.PENDING;
  }

  get isProcessing(): boolean {
    return this.status === PaymentStatus.PROCESSING;
  }

  get isCompleted(): boolean {
    return this.status === PaymentStatus.COMPLETED;
  }

  get isFailed(): boolean {
    return this.status === PaymentStatus.FAILED;
  }

  get isRefunded(): boolean {
    return this.status === PaymentStatus.REFUNDED;
  }

  get totalFees(): number {
    return this.platformFee + this.stripeFee;
  }
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

// Create indexes
PaymentSchema.index({ contractId: 1 });
PaymentSchema.index({ milestoneId: 1 }, { sparse: true });
PaymentSchema.index({ payerId: 1 });
PaymentSchema.index({ payeeId: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ paymentType: 1 });
PaymentSchema.index({ stripePaymentIntentId: 1 }, { sparse: true });
PaymentSchema.index({ stripeChargeId: 1 }, { sparse: true });
PaymentSchema.index({ stripeTransferId: 1 }, { sparse: true });
PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ deletedAt: 1 }, { sparse: true });

// Compound indexes
PaymentSchema.index({ payerId: 1, status: 1 });
PaymentSchema.index({ payeeId: 1, status: 1 });
PaymentSchema.index({ contractId: 1, status: 1 });
PaymentSchema.index({ status: 1, createdAt: -1 });

// Add virtual fields
PaymentSchema.virtual('isPending').get(function () {
  return this.status === PaymentStatus.PENDING;
});

PaymentSchema.virtual('isProcessing').get(function () {
  return this.status === PaymentStatus.PROCESSING;
});

PaymentSchema.virtual('isCompleted').get(function () {
  return this.status === PaymentStatus.COMPLETED;
});

PaymentSchema.virtual('isFailed').get(function () {
  return this.status === PaymentStatus.FAILED;
});

PaymentSchema.virtual('isRefunded').get(function () {
  return this.status === PaymentStatus.REFUNDED;
});

PaymentSchema.virtual('totalFees').get(function () {
  return this.platformFee + this.stripeFee;
});

// Pre-save middleware
PaymentSchema.pre('save', function (next) {
  // Set timestamps based on status changes
  if (this.isModified('status')) {
    const now = new Date();

    switch (this.status) {
      case PaymentStatus.PROCESSING:
        if (!this.processedAt) this.processedAt = now;
        break;
      case PaymentStatus.FAILED:
        if (!this.failedAt) this.failedAt = now;
        break;
      case PaymentStatus.REFUNDED:
        if (!this.refundedAt) this.refundedAt = now;
        break;
    }
  }

  next();
});

// Pre-find middleware to populate references
PaymentSchema.pre(/^find/, function (next) {
  // Populate will be handled at query level to avoid TypeScript issues
  next();
});

// Ensure virtuals are included in JSON
PaymentSchema.set('toJSON', { virtuals: true });
PaymentSchema.set('toObject', { virtuals: true });
