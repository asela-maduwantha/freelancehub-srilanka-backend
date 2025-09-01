import { Module } from '@nestjs/common';
import { ClientsController } from './controllers/clients.controller';
import { ClientsService } from './services/clients.service';
import { ProposalsModule } from '../proposals/proposals.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [ProposalsModule, ProjectsModule],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
