import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';
import { AuthModule } from '../auth/auth.module';
import { Dispute, DisputeSchema } from '../../database/schemas/dispute.schema';
import { Contract, ContractSchema } from '../../database/schemas/contract.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { Milestone, MilestoneSchema } from '../../database/schemas/milestone.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Dispute.name, schema: DisputeSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: User.name, schema: UserSchema },
      { name: Milestone.name, schema: MilestoneSchema },
    ]),
  ],
  controllers: [DisputesController],
  providers: [DisputesService],
  exports: [DisputesService],
})
export class DisputesModule {}
