import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsController } from './controllers/payments.controller';
import { StripeWebhookController } from './controllers/stripe-webhook.controller';
import { PaymentsService } from './services/payments.service';
import { StripeConnectService } from './services/stripe-connect.service';
import { Payment, PaymentSchema } from '../../schemas/payment.schema';
import { Contract, ContractSchema } from '../../schemas/contract.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from '../../common/services/email.service';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentSchedulerService } from './services/payment-scheduler.service';
import { PaymentErrorHandler } from './services/payment-error-handler.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: User.name, schema: UserSchema },
    ]),
    ConfigModule,
    ScheduleModule.forRoot(),
    NotificationsModule,
  ],
  controllers: [PaymentsController, StripeWebhookController],
  providers: [PaymentsService, StripeConnectService, EmailService, PaymentSchedulerService, PaymentErrorHandler],
  exports: [PaymentsService, StripeConnectService],
})
export class PaymentsModule {}
