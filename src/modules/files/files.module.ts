import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { MongooseModule } from '@nestjs/mongoose';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { AzureModule } from '../../services/azure/azure.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { User, UserSchema } from '../../database/schemas/user.schema';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    AzureModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MulterModule.register({
      // Configure multer for in-memory storage since we're uploading directly to Azure
      storage: require('multer').memoryStorage(),
      fileFilter: (req, file, callback) => {
        // Allow all file types - validation will be done in the service
        callback(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1, // Only one file at a time
      },
    }),
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
