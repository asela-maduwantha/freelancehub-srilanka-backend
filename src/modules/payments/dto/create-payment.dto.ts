
import { Types } from 'mongoose';

export interface CreatePaymentDto {
  contractId: Types.ObjectId;
  milestoneId?: Types.ObjectId;
  payerId: Types.ObjectId;
  payeeId: Types.ObjectId;
  amount: number;
  currency?: string;
  paymentType: 'milestone' | 'hourly' | 'bonus' | 'refund';
  platformFeePercentage: number;
  description?: string;
  metadata?: Record<string, any>;
}