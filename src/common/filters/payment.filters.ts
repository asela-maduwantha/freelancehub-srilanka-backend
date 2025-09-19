import { Types } from 'mongoose';
import { PaymentStatus } from '../enums/payment-status.enum';

export interface PaymentFilters {
  contractId?: Types.ObjectId;
  milestoneId?: Types.ObjectId;
  payerId?: Types.ObjectId;
  payeeId?: Types.ObjectId;
  status?: PaymentStatus;
  paymentType?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}