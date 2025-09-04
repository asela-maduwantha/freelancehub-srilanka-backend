import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DisputesController } from './controllers/disputes.controller';
import { DisputesService } from './services/disputes.service';
import { Dispute, DisputeSchema } from '../../schemas/dispute.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { Contract, ContractSchema } from '../../schemas/contract.schema';
import { UsersModule } from '../users/users.module';
import { ContractsModule } from '../contracts/contracts.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Dispute.name, schema: DisputeSchema },
      { name: User.name, schema: UserSchema },
      { name: Contract.name, schema: ContractSchema }
    ]),
    UsersModule,
    ContractsModule,
  ],
  controllers: [DisputesController],
  providers: [DisputesService],
  exports: [DisputesService],
})
export class DisputesModule {}
