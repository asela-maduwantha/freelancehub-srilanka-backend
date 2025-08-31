import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: String, ref: 'User', required: true })
  payerId: string; // Client who is paying

  @Prop({ type: String, ref: 'User', required: true })
  payeeId: string; // Freelancer who is receiving payment

  @Prop({ type: String, ref: 'Project', required: true })
  projectId: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  currency: string;

  @Prop({
    type: String,
    enum: ['stripe', 'paypal', 'bank_transfer'],
    default: 'stripe'
  })
  paymentMethod: string;

  @Prop()
  stripePaymentIntentId: string;

  @Prop({
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  })
  status: string;

  @Prop({
    type: String,
    enum: ['project_payment', 'milestone_payment', 'bonus', 'refund'],
    default: 'project_payment'
  })
  type: string;

  @Prop()
  description: string;

  @Prop()
  milestoneId: string; // If this is a milestone payment

  @Prop({
    type: {
      fee: Number,
      percentage: Number,
      currency: String
    }
  })
  platformFee: {
    fee: number;
    percentage: number;
    currency: string;
  };

  @Prop({
    type: {
      amount: Number,
      reason: String,
      processedAt: Date,
      stripeRefundId: String
    }
  })
  refund?: {
    amount: number;
    reason: string;
    processedAt: Date;
    stripeRefundId: string;
  };

  @Prop()
  processedAt: Date;

  @Prop()
  dueDate: Date;

  @Prop({
    type: [{
      status: String,
      timestamp: Date,
      note: String
    }]
  })
  history: {
    status: string;
    timestamp: Date;
    note: string;
  }[];

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
