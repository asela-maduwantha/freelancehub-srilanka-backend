import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProposalsController } from './controllers/proposals.controller';
import { ProposalsService } from './services/proposals.service';
import { Proposal, ProposalSchema } from './schemas/proposal.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { UsersModule } from '../users/users.module';
import { ProjectsModule } from '../projects/projects.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Proposal.name, schema: ProposalSchema },
      { name: User.name, schema: UserSchema },
      { name: Project.name, schema: ProjectSchema }
    ]),
    UsersModule,
    ProjectsModule,
    CommonModule,
  ],
  controllers: [ProposalsController],
  providers: [ProposalsService],
  exports: [ProposalsService],
})
export class ProposalsModule {}
