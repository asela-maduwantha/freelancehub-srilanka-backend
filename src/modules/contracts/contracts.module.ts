import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContractsController } from './controllers/contracts.controller';
import { ContractsService } from './services/contracts.service';
import { Contract, ContractSchema } from '../../schemas/contract.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { Project, ProjectSchema } from '../../schemas/project.schema';
import { Proposal, ProposalSchema } from '../../schemas/proposal.schema';
import {
  FreelancerProfile,
  FreelancerProfileSchema,
} from '../../schemas/freelancer-profile.schema';
import {
  ClientProfile,
  ClientProfileSchema,
} from '../../schemas/client-profile.schema';
import { UsersModule } from '../users/users.module';
import { ProjectsModule } from '../projects/projects.module';
import { ProposalsModule } from '../proposals/proposals.module';
import { PaymentsModule } from '../payments/payments.module';
import { PdfService } from '../../common/services/pdf.service';
import { EmailService } from '../../common/services/email.service';
import { Payment, PaymentSchema } from '../../schemas/payment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contract.name, schema: ContractSchema },
      { name: User.name, schema: UserSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Proposal.name, schema: ProposalSchema },
      { name: FreelancerProfile.name, schema: FreelancerProfileSchema },
      { name: ClientProfile.name, schema: ClientProfileSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
    UsersModule,
    forwardRef(() => ProjectsModule),
    forwardRef(() => ProposalsModule),
    PaymentsModule,
  ],
  controllers: [ContractsController],
  providers: [ContractsService, PdfService, EmailService],
  exports: [ContractsService],
})
export class ContractsModule {}
