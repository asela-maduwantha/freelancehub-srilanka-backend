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
import { LoggerService } from '../../services/logger/logger.service';
import { PdfService } from '../../services/pdf/pdf.service';

@Module({
  imports: [
    // Auth module for JWT services
    AuthModule,

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
  providers: [ProposalsService, ContractsService, LoggerService, PdfService],
  exports: [ProposalsService],
})
export class ProposalsModule {}
