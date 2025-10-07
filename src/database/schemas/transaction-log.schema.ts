import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'transaction_logs',
})
export class TransactionLog extends Document {
  @Prop({ required: true, unique: true })
  transactionId: string;

  @Prop({
    required: true,
    enum: ['payment', 'refund', 'withdrawal', 'fee', 'bonus'],
  })
  type: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  fromUserId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  toUserId?: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ default: 0, min: 0 })
  fee: number;

  @Prop({ required: true, min: 0 })
  netAmount: number;

  @Prop({ type: Types.ObjectId })
  relatedId?: Types.ObjectId;

  @Prop({ enum: ['contract', 'milestone', 'withdrawal', 'dispute'] })
  relatedType?: string;

  @Prop()
  stripeId?: string;

  @Prop()
  chargeId?: string;

  @Prop({
    required: true,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending',
  })
  status: string;

  @Prop()
  description?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop()
  processedAt?: Date;

  @Prop()
  deletedAt?: Date;
}

export const TransactionLogSchema =
  SchemaFactory.createForClass(TransactionLog);

// Create indexes
TransactionLogSchema.index({ transactionId: 1 }, { unique: true });
TransactionLogSchema.index({ fromUserId: 1 });
TransactionLogSchema.index({ toUserId: 1 });
TransactionLogSchema.index({ type: 1 });
TransactionLogSchema.index({ status: 1 });
TransactionLogSchema.index({ createdAt: -1 });
TransactionLogSchema.index({ stripeId: 1 }, { sparse: true });
TransactionLogSchema.index({ fromUserId: 1, createdAt: -1 });
TransactionLogSchema.index({ toUserId: 1, createdAt: -1 });
TransactionLogSchema.index({ deletedAt: 1 }, { sparse: true });

// Add virtual fields
TransactionLogSchema.virtual('isPending').get(function () {
  return this.status === 'pending';
});

TransactionLogSchema.virtual('isCompleted').get(function () {
  return this.status === 'completed';
});

TransactionLogSchema.virtual('isFailed').get(function () {
  return this.status === 'failed';
});

TransactionLogSchema.virtual('isCancelled').get(function () {
  return this.status === 'cancelled';
});

TransactionLogSchema.virtual('feeAmount').get(function () {
  return (this.amount * this.fee) / 100;
});

TransactionLogSchema.virtual('formattedAmount').get(function () {
  return `${this.currency} ${this.amount.toFixed(2)}`;
});

// Pre-save middleware
TransactionLogSchema.pre('save', function (next) {
  // Set processed timestamp when status changes to completed
  if (
    this.isModified('status') &&
    this.status === 'completed' &&
    !this.processedAt
  ) {
    this.processedAt = new Date();
  }
  next();
});

// Pre-find middleware to populate references
TransactionLogSchema.pre(/^find/, function (next) {
  // Populate will be handled at query level to avoid TypeScript issues
  next();
});

// Ensure virtuals are included in JSON
TransactionLogSchema.set('toJSON', { virtuals: true });
TransactionLogSchema.set('toObject', { virtuals: true });
