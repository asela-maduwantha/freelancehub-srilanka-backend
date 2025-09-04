import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SavedProject, SavedProjectSchema } from '../../schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SavedProject.name, schema: SavedProjectSchema },
    ]),
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class SavedProjectsModule {}
