import { Module } from '@nestjs/common';
import { StorageService } from './services/storage.service';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { StorageController } from './storage.controller';

@Module({
  imports: [
    ConfigModule,
    MulterModule.register({
      dest: './uploads', // Temporary storage before uploading to Azure
    }),
  ],
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
