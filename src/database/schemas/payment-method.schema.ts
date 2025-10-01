import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentMethodDocument = PaymentMethod & Document;

@Schema({ timestamps: true })
export class PaymentMethod {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  stripePaymentMethodId: string;

  @Prop({ type: String, required: true, enum: ['card', 'bank_account'] })
  type: 'card' | 'bank_account';

  @Prop({ type: Object })
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };

  @Prop({ type: Object })
  bankAccount?: {
    bankName: string;
    last4: string;
    routingNumber: string;
  };

  @Prop({ type: Boolean, default: false })
  isDefault: boolean;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PaymentMethodSchema = SchemaFactory.createForClass(PaymentMethod);

// Add indexes for better query performance
PaymentMethodSchema.index({ userId: 1, isActive: 1 });
PaymentMethodSchema.index({ stripePaymentMethodId: 1 }, { unique: true });