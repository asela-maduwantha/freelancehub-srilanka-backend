import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// Config files
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import mailConfig from './config/mail.config';
import azureConfig from './config/azure.config';
import stripeConfig from './config/stripe.config';

// Modules
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { ProposalsModule } from './modules/proposals/proposals.module';
import { SkillsModule } from './modules/skills/skills.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { MilestonesModule } from './modules/milestones/milestones.module';
import { FilesModule } from './modules/files/files.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { WithdrawalsModule } from './modules/withdrawals/withdrawals.module';
import { PaymentMethodsModule } from './modules/payment-methods/payment-methods.module';
import { MessagesModule } from './modules/messages/messages.module';
import { StripeModule } from './services/stripe/stripe.module';

@Module({
  imports: [
    // Config module with environment-based configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, mailConfig, azureConfig, stripeConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // Cache module for performance optimization
    CacheModule.register({
      isGlobal: true,
      ttl: 300, // 5 minutes default TTL
      max: 1000, // Maximum number of items in cache
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60000, 
        limit: 100, 
      },
    ]),

    // Schedule module for cron jobs
    ScheduleModule.forRoot(),

    // Database module
    DatabaseModule,

    // Global services
    StripeModule,

    // Feature modules
    AuthModule,
    UsersModule,
    JobsModule,
    ProposalsModule,
    SkillsModule,
    CategoriesModule,
    ContractsModule,
    PaymentsModule,
    MilestonesModule,
    FilesModule,
    DashboardModule,
    NotificationsModule,
    ReviewsModule,
    WithdrawalsModule,
    PaymentMethodsModule,
    MessagesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
