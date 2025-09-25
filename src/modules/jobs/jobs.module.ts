import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { Job, JobSchema } from '../../database/schemas/job.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { AuthModule } from '../auth/auth.module';
import { ProposalsModule } from '../proposals/proposals.module';
import { UsersModule } from '../users/users.module';
import {
  SavedJob,
  SavedJobSchema,
} from '../../database/schemas/saved-job.schema';
import {
  JobReport,
  JobReportSchema,
} from '../../database/schemas/job-report.schema';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    // Auth module for JWT services
    AuthModule,

    // Proposals module for accessing proposal data
    ProposalsModule,

    // Users module for accessing user data
    UsersModule,

    // Notifications module for real-time notifications
    NotificationsModule,

    // Mongoose models
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema },
      { name: User.name, schema: UserSchema },
      { name: SavedJob.name, schema: SavedJobSchema },
      { name: JobReport.name, schema: JobReportSchema },
    ]),
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
