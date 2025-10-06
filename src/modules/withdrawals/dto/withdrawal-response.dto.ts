import { Expose, Type } from 'class-transformer';
import { WithdrawalStatus } from '../../../common/enums/withdrawal-status.enum';
import { WithdrawalMethod } from './create-withdrawal.dto';

class BankAccountResponseDto {
  @Expose()
  accountHolderName: string;

  @Expose()
  accountNumber: string;

  @Expose()
  routingNumber: string;

  @Expose()
  bankName: string;

  @Expose()
  country: string;
}

class FreelancerResponseDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  firstName?: string;

  @Expose()
  lastName?: string;
}

export class WithdrawalResponseDto {
  @Expose()
  id: string;

  @Expose()
  @Type(() => FreelancerResponseDto)
  freelancerId?: FreelancerResponseDto;

  @Expose()
  amount: number;

  @Expose()
  currency: string;

  @Expose()
  stripeTransferId?: string;

  @Expose()
  stripePayoutId?: string;

  @Expose()
  stripeAccountId?: string;

  @Expose()
  @Type(() => BankAccountResponseDto)
  bankAccount?: BankAccountResponseDto;

  @Expose()
  status: WithdrawalStatus;

  @Expose()
  processingFee: number;

  @Expose()
  finalAmount: number;

  @Expose()
  description?: string;

  @Expose()
  adminNotes?: string;

  @Expose()
  metadata?: Record<string, any>;

  @Expose()
  requestedAt: Date;

  @Expose()
  processedAt?: Date;

  @Expose()
  completedAt?: Date;

  @Expose()
  failedAt?: Date;

  @Expose()
  cancelledAt?: Date;

  @Expose()
  errorMessage?: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  fullName?: string;

  @Expose()
  isPending?: boolean;

  @Expose()
  isProcessing?: boolean;

  @Expose()
  isCompleted?: boolean;

  @Expose()
  isFailed?: boolean;

  @Expose()
  isCancelled?: boolean;

  @Expose()
  processingFeeAmount?: number;
}