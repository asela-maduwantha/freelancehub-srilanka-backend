import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WithdrawalsController } from './withdrawals.controller';
import { WithdrawalsService } from './withdrawals.service';
import { Withdrawal, WithdrawalSchema } from '../../database/schemas/withdrawal.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Withdrawal.name, schema: WithdrawalSchema },
      { name: User.name, schema: UserSchema },
    ]),
    PaymentsModule, // For transaction logging
    NotificationsModule,
    AuthModule, // For JWT authentication
  ],
  controllers: [WithdrawalsController],
  providers: [WithdrawalsService],
  exports: [WithdrawalsService],
})
export class WithdrawalsModule {}