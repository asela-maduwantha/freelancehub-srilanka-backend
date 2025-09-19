import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsController } from './payments.controller';
import { PaymentService } from './payments.service';
import { TransactionLogService } from './transaction-log.service';
import { Payment, PaymentSchema } from '../../database/schemas/payment.schema';
import { TransactionLog, TransactionLogSchema } from '../../database/schemas/transaction-log.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: TransactionLog.name, schema: TransactionLogSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuthModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentService, TransactionLogService],
  exports: [PaymentService, TransactionLogService],
})
export class PaymentsModule {}
