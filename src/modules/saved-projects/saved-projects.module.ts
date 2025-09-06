import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SavedProjectsController } from './controllers/saved-projects.controller';
import { SavedProjectsService } from './services/saved-projects.service';
import { SavedProject, SavedProjectSchema } from '../../schemas/saved-project.schema';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SavedProject.name, schema: SavedProjectSchema },
    ]),
    ProjectsModule,
  ],
  controllers: [SavedProjectsController],
  providers: [SavedProjectsService],
  exports: [SavedProjectsService],
})
export class SavedProjectsModule {}
