import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Milestone,
  MilestoneSchema,
} from '../../database/schemas/milestone.schema';
import { Contract, ContractSchema } from '../../database/schemas/contract.schema';
import { Payment, PaymentSchema } from '../../database/schemas/payment.schema';
// import { MilestonesController } from './milestones.controller';
import { MilestoneService } from './milestones.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Milestone.name, schema: MilestoneSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
  ],
  // controllers: [MilestonesController],
  providers: [MilestoneService],
  exports: [MilestoneService],
})
export class MilestonesModule {}
