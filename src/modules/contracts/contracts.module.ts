import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Contract,
  ContractSchema,
} from '../../database/schemas/contract.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { Proposal, ProposalSchema } from '../../database/schemas/proposal.schema';
import { Job, JobSchema } from '../../database/schemas/job.schema';
import { Milestone, MilestoneSchema } from '../../database/schemas/milestone.schema';
import { PdfModule } from '../../services/pdf/pdf.module';
import { LoggerModule } from '../../services/logger/logger.module';
import { StripeModule } from '../../services/stripe/stripe.module';
import { StripeService } from '../../services/stripe/stripe.service';
import { AuthModule } from '../auth/auth.module';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contract.name, schema: ContractSchema },
      { name: Job.name, schema: JobSchema },
      { name: Proposal.name, schema: ProposalSchema },
      { name: User.name, schema: UserSchema },
      { name: Milestone.name, schema: MilestoneSchema },
    ]),
    LoggerModule,
    AuthModule,
    PdfModule,
    NotificationsModule,
    StripeModule,
  ],
  controllers: [ContractsController],
  providers: [ContractsService, StripeService],
  exports: [ContractsService],
})
export class ContractsModule {}
