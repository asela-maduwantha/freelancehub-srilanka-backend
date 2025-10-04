import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentsController } from './payments.controller';
import { PaymentService } from './payments.service';
import { TransactionLogService } from './transaction-log.service';
import { PaymentReconciliationJob } from './payment-reconciliation.job';
import { Payment, PaymentSchema } from '../../database/schemas/payment.schema';
import { TransactionLog, TransactionLogSchema } from '../../database/schemas/transaction-log.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { Contract, ContractSchema } from '../../database/schemas/contract.schema';
import { Milestone, MilestoneSchema } from '../../database/schemas/milestone.schema';
import { Job, JobSchema } from '../../database/schemas/job.schema';
import { Proposal, ProposalSchema } from '../../database/schemas/proposal.schema';
import { ProcessedWebhookEvent, ProcessedWebhookEventSchema } from '../../database/schemas/processed-webhook-event.schema';
import { FailedBalanceUpdate, FailedBalanceUpdateSchema } from '../../database/schemas/failed-balance-update.schema';
import { AuthModule } from '../auth/auth.module';
import { StripeService } from '../../services/stripe/stripe.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { MilestonesModule } from '../milestones/milestones.module';

@Module({
  imports: [
    ScheduleModule.forRoot(), // Enable cron jobs
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: TransactionLog.name, schema: TransactionLogSchema },
      { name: User.name, schema: UserSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: Milestone.name, schema: MilestoneSchema },
      { name: Job.name, schema: JobSchema },
      { name: Proposal.name, schema: ProposalSchema },
      { name: ProcessedWebhookEvent.name, schema: ProcessedWebhookEventSchema },
      { name: FailedBalanceUpdate.name, schema: FailedBalanceUpdateSchema },
    ]),
    AuthModule,
    NotificationsModule,
    forwardRef(() => MilestonesModule),
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentService,
    TransactionLogService,
    StripeService,
    PaymentReconciliationJob, // Add reconciliation cron job
  ],
  exports: [PaymentService, TransactionLogService, StripeService],
})
export class PaymentsModule {}
