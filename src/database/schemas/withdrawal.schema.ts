import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { WithdrawalStatus } from '../../common/enums/withdrawal-status.enum';

@Schema({ _id: false })
export class BankAccount {
  @Prop({ required: true })
  accountHolderName: string;

  @Prop({ required: true })
  accountNumber: string; // Should be encrypted

  @Prop({ required: true })
  routingNumber: string; // Should be encrypted

  @Prop({ required: true })
  bankName: string;

  @Prop({ required: true })
  country: string;
}

@Schema({
  timestamps: true,
  collection: 'withdrawals',
})
export class Withdrawal extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  freelancerId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop()
  stripeTransferId?: string;

  @Prop()
  stripePayoutId?: string;

  @Prop()
  stripeAccountId?: string;

  @Prop({ type: BankAccount })
  bankAccount?: BankAccount;

  @Prop({
    required: true,
    enum: WithdrawalStatus,
    default: WithdrawalStatus.PENDING,
  })
  status: WithdrawalStatus;

  @Prop({ default: 0, min: 0 })
  processingFee: number;

  @Prop({ required: true, min: 0 })
  finalAmount: number;

  @Prop()
  description?: string;

  @Prop()
  adminNotes?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>; // For idempotency keys and other metadata

  @Prop({ default: Date.now })
  requestedAt: Date;

  @Prop()
  processedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  failedAt?: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop()
  errorMessage?: string;

  @Prop()
  deletedAt?: Date;
}

export const WithdrawalSchema = SchemaFactory.createForClass(Withdrawal);

// Create indexes
WithdrawalSchema.index({ freelancerId: 1 });
WithdrawalSchema.index({ status: 1 });
WithdrawalSchema.index({ requestedAt: -1 });
WithdrawalSchema.index({ stripeTransferId: 1 }, { sparse: true });
WithdrawalSchema.index({ freelancerId: 1, status: 1 });
WithdrawalSchema.index({ deletedAt: 1 }, { sparse: true });
WithdrawalSchema.index({ 'metadata.idempotencyKey': 1 }, { sparse: true, unique: true }); // Idempotency support

// Add virtual fields
WithdrawalSchema.virtual('isPending').get(function () {
  return this.status === WithdrawalStatus.PENDING;
});

WithdrawalSchema.virtual('isProcessing').get(function () {
  return this.status === WithdrawalStatus.PROCESSING;
});

WithdrawalSchema.virtual('isCompleted').get(function () {
  return this.status === WithdrawalStatus.COMPLETED;
});

WithdrawalSchema.virtual('isFailed').get(function () {
  return this.status === WithdrawalStatus.FAILED;
});

WithdrawalSchema.virtual('isCancelled').get(function () {
  return this.status === WithdrawalStatus.CANCELLED;
});

WithdrawalSchema.virtual('processingFeeAmount').get(function () {
  return (this.amount * this.processingFee) / 100;
});

// Pre-save middleware
WithdrawalSchema.pre('save', function (next) {
  // Set timestamps based on status changes
  if (this.isModified('status')) {
    const now = new Date();

    switch (this.status) {
      case WithdrawalStatus.PROCESSING:
        if (!this.processedAt) this.processedAt = now;
        break;
      case WithdrawalStatus.COMPLETED:
        if (!this.completedAt) this.completedAt = now;
        break;
      case WithdrawalStatus.FAILED:
        if (!this.failedAt) this.failedAt = now;
        break;
      case WithdrawalStatus.CANCELLED:
        if (!this.cancelledAt) this.cancelledAt = now;
        break;
    }
  }

  next();
});

// Pre-find middleware to populate references
WithdrawalSchema.pre(/^find/, function (next) {
  // Populate will be handled at query level to avoid TypeScript issues
  next();
});

// Ensure virtuals are included in JSON
WithdrawalSchema.set('toJSON', { virtuals: true });
WithdrawalSchema.set('toObject', { virtuals: true });
