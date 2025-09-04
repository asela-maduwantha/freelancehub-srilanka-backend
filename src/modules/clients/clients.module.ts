import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsController } from './controllers/clients.controller';
import { ClientsService } from './services/clients.service';
import { ProposalsModule } from '../proposals/proposals.module';
import { ProjectsModule } from '../projects/projects.module';
import { User, UserSchema } from '../../schemas/user.schema';
import {
  ClientProfile,
  ClientProfileSchema,
} from '../../schemas/client-profile.schema';
import { Project, ProjectSchema } from '../../schemas/project.schema';
import { Contract, ContractSchema } from '../../schemas/contract.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: ClientProfile.name, schema: ClientProfileSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Contract.name, schema: ContractSchema },
    ]),
    ProposalsModule,
    ProjectsModule,
  ],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
