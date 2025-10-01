import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentMethodsController } from './payment-methods.controller';
import { PaymentMethodsService } from './payment-methods.service';
import { PaymentMethod, PaymentMethodSchema } from '../../database/schemas/payment-method.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { StripeModule } from '../../services/stripe/stripe.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentMethod.name, schema: PaymentMethodSchema },
      { name: User.name, schema: UserSchema }
    ]),
    StripeModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [PaymentMethodsController],
  providers: [PaymentMethodsService],
  exports: [PaymentMethodsService],
})
export class PaymentMethodsModule {}