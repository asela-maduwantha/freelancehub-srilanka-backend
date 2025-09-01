import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './controllers/users.controller';
import { ClientsController } from './controllers/clients.controller';
import { UsersService } from './services/users.service';
import { User, UserSchema } from './schemas/user.schema';
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
  controllers: [UsersController, ClientsController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
