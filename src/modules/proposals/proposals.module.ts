import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProposalsController } from './controllers/proposals.controller';
import { ProposalsService } from './services/proposals.service';
import { Proposal, ProposalSchema } from '../../schemas/proposal.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { Project, ProjectSchema } from '../../schemas/project.schema';
import { UsersModule } from '../users/users.module';
import { CommonModule } from '../../common/common.module';
import { ContractsModule } from '../contracts/contracts.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Proposal.name, schema: ProposalSchema },
      { name: User.name, schema: UserSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
    UsersModule,
    CommonModule,
    forwardRef(() => ContractsModule),
    NotificationsModule,
  ],
  controllers: [ProposalsController],
  providers: [ProposalsService],
  exports: [ProposalsService],
})
export class ProposalsModule {}
