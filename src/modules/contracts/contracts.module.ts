import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContractsController } from './controllers/contracts.controller';
import { ContractsService } from './services/contracts.service';
import { Contract, ContractSchema } from './schemas/contract.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { Proposal, ProposalSchema } from '../proposals/schemas/proposal.schema';
import { UsersModule } from '../users/users.module';
import { ProjectsModule } from '../projects/projects.module';
import { ProposalsModule } from '../proposals/proposals.module';
import { PdfService } from '../../common/services/pdf.service';
import { EmailService } from '../../common/services/email.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contract.name, schema: ContractSchema },
      { name: User.name, schema: UserSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Proposal.name, schema: ProposalSchema }
    ]),
    UsersModule,
    forwardRef(() => ProjectsModule),
    forwardRef(() => ProposalsModule),
  ],
  controllers: [ContractsController],
  providers: [ContractsService, PdfService, EmailService],
  exports: [ContractsService],
})
export class ContractsModule {}
