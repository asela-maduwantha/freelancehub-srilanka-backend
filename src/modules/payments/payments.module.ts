import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsController } from './controllers/payments.controller';
import { StripeWebhookController } from './controllers/stripe-webhook.controller';
import { PaymentMethodsController } from './controllers/payment-methods.controller';
import { PaymentsService } from './services/payments.service';
import { StripeConnectService } from './services/stripe-connect.service';
import { PaymentMethodsService } from './services/payment-methods.service';
import { Payment, PaymentSchema } from '../../schemas/payment.schema';
import { Contract, ContractSchema } from '../../schemas/contract.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from '../../common/services/email.service';
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
    NotificationsModule,
  ],
  controllers: [
    PaymentsController,
    StripeWebhookController,
    PaymentMethodsController,
  ],
  providers: [
    PaymentsService,
    StripeConnectService,
    PaymentMethodsService,
    EmailService,
    PaymentErrorHandler,
  ],
  exports: [PaymentsService, StripeConnectService, PaymentMethodsService],
})
export class PaymentsModule {}
