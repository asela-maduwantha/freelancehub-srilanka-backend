import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProposalsController } from './proposals.controller';
import { ProposalsService } from './proposals.service';
import {
  Proposal,
  ProposalSchema,
} from '../../database/schemas/proposal.schema';
import { Job, JobSchema } from '../../database/schemas/job.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { Contract, ContractSchema } from '../../database/schemas/contract.schema';
import { Milestone, MilestoneSchema } from '../../database/schemas/milestone.schema';
import { AuthModule } from '../auth/auth.module';
import { ContractsService } from '../contracts/contracts.service';
import { ContractsModule } from '../contracts/contracts.module';
import { LoggerService } from '../../services/logger/logger.service';
import { PdfService } from '../../services/pdf/pdf.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    // Auth module for JWT services
    AuthModule,

    // Notifications module for real-time notifications
    NotificationsModule,

    // Contracts module for contract operations
    ContractsModule,

    // Mongoose models
    MongooseModule.forFeature([
      { name: Proposal.name, schema: ProposalSchema },
      { name: Job.name, schema: JobSchema },
      { name: User.name, schema: UserSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: Milestone.name, schema: MilestoneSchema },
    ]),
  ],
  controllers: [ProposalsController],
  providers: [ProposalsService, LoggerService, PdfService],
  exports: [ProposalsService],
})
export class ProposalsModule {}
