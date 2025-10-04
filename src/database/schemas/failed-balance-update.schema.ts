import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Schema to track failed balance updates for retry mechanism.
 * Used when payment completes but balance update fails.
 */
@Schema({
  timestamps: true,
  collection: 'failed_balance_updates',
})
export class FailedBalanceUpdate extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Payment', index: true })
  paymentId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  freelancerId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ required: true, enum: ['pending', 'retrying', 'completed', 'failed'], default: 'pending' })
  status: string;

  @Prop()
  error: string;

  @Prop({ default: 0, min: 0 })
  retryCount: number;

  @Prop()
  lastRetryAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const FailedBalanceUpdateSchema = SchemaFactory.createForClass(FailedBalanceUpdate);

// Indexes
FailedBalanceUpdateSchema.index({ paymentId: 1 });
FailedBalanceUpdateSchema.index({ freelancerId: 1 });
FailedBalanceUpdateSchema.index({ status: 1 });
FailedBalanceUpdateSchema.index({ createdAt: 1 });
