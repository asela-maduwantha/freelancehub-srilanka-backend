import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import databaseConfig from './config/database.config';
import stripeConfig from './config/stripe.config';
import azureConfig from './config/azure.config';
import emailConfig from './config/email.config';
import appConfig from './config/app.config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ProposalsModule } from './modules/proposals/proposals.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { StorageModule } from './modules/storage/storage.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { AdminModule } from './modules/admin/admin.module';
import { CommonModule } from './common/common.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { RateLimitGuard } from './common/guards/rate-limit.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        databaseConfig,
        stripeConfig,
        azureConfig,
        emailConfig,
        appConfig,
      ],
      envFilePath: ['.env.local', '.env'],
    }),
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.get('database.uri'),
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }),
      inject: [ConfigService],
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 300, // 5 minutes default
      max: 1000, // maximum number of items in cache (increased for better performance)
    }),
    AuthModule,
    UsersModule,
    ProjectsModule,
    ProposalsModule,
    ContractsModule,
    DisputesModule,
    PaymentsModule,
    StorageModule,
    ReviewsModule,
    AdminModule,
    CommonModule,
    ClientsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule {}
