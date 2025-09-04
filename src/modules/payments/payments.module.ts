import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsController } from './controllers/payments.controller';
import { PaymentsService } from './services/payments.service';
import { StripeConnectService } from './services/stripe-connect.service';
import { Payment, PaymentSchema } from '../../schemas/payment.schema';
import { Contract, ContractSchema } from '../../schemas/contract.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from '../../common/services/email.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: User.name, schema: UserSchema },
    ]),
    ConfigModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, StripeConnectService, EmailService],
  exports: [PaymentsService, StripeConnectService],
})
export class PaymentsModule {}
