import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FreelancersController } from './controllers/freelancers.controller';
import { FreelancersService } from './services/freelancers.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { Contract, ContractSchema } from '../contracts/schemas/contract.schema';
import { Proposal, ProposalSchema } from '../proposals/schemas/proposal.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: Proposal.name, schema: ProposalSchema },
    ]),
  ],
  controllers: [FreelancersController],
  providers: [FreelancersService],
  exports: [FreelancersService],
})
export class FreelancersModule {}
