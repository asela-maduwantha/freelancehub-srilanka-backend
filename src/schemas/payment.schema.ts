import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class PaymentHistory {
  @Prop({ required: true })
  status: string;

  @Prop({ required: true })
  timestamp: Date;

  @Prop()
  note: string;
}

@Schema({ _id: false })
export class RefundDetails {
  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  reason: string;

  @Prop({ required: true })
  refundedAt: Date;

  @Prop()
  stripeRefundId: string;
}

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Contract' })
  contractId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project' })
  projectId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  payerId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  payeeId: Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ required: true, enum: ['pending', 'processing', 'completed', 'failed', 'refunded'] })
  status: string;

  @Prop({ required: true, enum: ['stripe', 'paypal', 'bank_transfer'] })
  paymentMethod: string;

  @Prop()
  stripePaymentIntentId: string;

  @Prop()
  description: string;

  @Prop()
  failureReason: string;

  @Prop()
  processedAt: Date;

  @Prop({ type: [PaymentHistory], default: [] })
  history: PaymentHistory[];

  @Prop({ type: RefundDetails })
  refund: RefundDetails;

  createdAt?: Date;
  updatedAt?: Date;
}

export type PaymentDocument = Payment & Document;
export const PaymentSchema = SchemaFactory.createForClass(Payment);

// Indexes
PaymentSchema.index({ contractId: 1 });
PaymentSchema.index({ payerId: 1 });
PaymentSchema.index({ payeeId: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ createdAt: -1 });