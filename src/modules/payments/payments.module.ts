import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsController } from './payments.controller';
import { PaymentService } from './payments.service';
import { TransactionLogService } from './transaction-log.service';
import { Payment, PaymentSchema } from '../../database/schemas/payment.schema';
import { TransactionLog, TransactionLogSchema } from '../../database/schemas/transaction-log.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { Contract, ContractSchema } from '../../database/schemas/contract.schema';
import { Milestone, MilestoneSchema } from '../../database/schemas/milestone.schema';
import { AuthModule } from '../auth/auth.module';
import { StripeService } from '../../services/stripe/stripe.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { MilestonesModule } from '../milestones/milestones.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: TransactionLog.name, schema: TransactionLogSchema },
      { name: User.name, schema: UserSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: Milestone.name, schema: MilestoneSchema },
    ]),
    AuthModule,
    NotificationsModule,
    forwardRef(() => MilestonesModule),
  ],
  controllers: [PaymentsController],
  providers: [PaymentService, TransactionLogService, StripeService],
  exports: [PaymentService, TransactionLogService, StripeService],
})
export class PaymentsModule {}
