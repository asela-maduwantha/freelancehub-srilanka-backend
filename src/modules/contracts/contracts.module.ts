import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Contract,
  ContractSchema,
} from '../../database/schemas/contract.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { Proposal, ProposalSchema } from '../../database/schemas/proposal.schema';
import { Job, JobSchema } from '../../database/schemas/job.schema';
import { Milestone, MilestoneSchema } from '../../database/schemas/milestone.schema';
import { Payment, PaymentSchema } from '../../database/schemas/payment.schema';
import { TransactionLog, TransactionLogSchema } from '../../database/schemas/transaction-log.schema';
import { PdfModule } from '../../services/pdf/pdf.module';
import { LoggerModule } from '../../services/logger/logger.module';
import { StripeModule } from '../../services/stripe/stripe.module';
import { StripeService } from '../../services/stripe/stripe.service';
import { AuthModule } from '../auth/auth.module';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentMethodsModule } from '../payment-methods/payment-methods.module';
import { TransactionLogService } from '../payments/transaction-log.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contract.name, schema: ContractSchema },
      { name: Job.name, schema: JobSchema },
      { name: Proposal.name, schema: ProposalSchema },
      { name: User.name, schema: UserSchema },
      { name: Milestone.name, schema: MilestoneSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: TransactionLog.name, schema: TransactionLogSchema },
    ]),
    LoggerModule,
    AuthModule,
    PdfModule,
    NotificationsModule,
    StripeModule,
    PaymentMethodsModule,
  ],
  controllers: [ContractsController],
  providers: [ContractsService, StripeService, TransactionLogService],
  exports: [ContractsService],
})
export class ContractsModule {}
