import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Contract' })
  contractId: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  milestoneId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  payerId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  payeeId: Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 0 })
  platformFee: number;

  @Prop({ required: true })
  netAmount: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ required: true })
  paymentMethod: string;

  @Prop()
  stripePaymentIntentId: string;

  @Prop()
  stripeChargeId: string;

  @Prop()
  stripeTransferId: string;

  @Prop()
  stripeRefundId: string;

  @Prop({ default: 'held', enum: ['held', 'released', 'refunded', 'cancelled'] })
  escrowStatus: string;

  @Prop({
    default: 'pending',
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
  })
  status: string;

  @Prop()
  paidAt: Date;

  @Prop()
  releasedAt: Date;

  @Prop()
  cancelledAt: Date;

  @Prop({ default: false })
  autoRelease: boolean;

  @Prop()
  autoReleaseDays: number;

  @Prop()
  autoReleaseDate: Date;
}

export type PaymentDocument = Payment & Document;
export const PaymentSchema = SchemaFactory.createForClass(Payment);

// Indexes
PaymentSchema.index({ contractId: 1 });
PaymentSchema.index({ milestoneId: 1 });
PaymentSchema.index({ payerId: 1 });
PaymentSchema.index({ payeeId: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ escrowStatus: 1 });
PaymentSchema.index({ createdAt: -1 });
