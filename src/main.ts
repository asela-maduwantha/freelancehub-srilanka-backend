import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as compression from 'compression';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logLevel = (process.env.LOG_LEVEL?.split(',').filter((level) =>
    ['error', 'warn', 'log', 'verbose', 'debug', 'fatal'].includes(level),
  ) as ('error' | 'warn' | 'log' | 'verbose' | 'debug' | 'fatal')[]) || [
    'error',
    'warn',
    'log',
  ];

  const app = await NestFactory.create(AppModule, {
    logger: logLevel,
  });

  const configService = app.get(ConfigService);


  const port = configService.get('PORT', 3000);
  const apiPrefix = configService.get('API_PREFIX', 'api');
  const corsOrigins = configService.get('app').corsOrigins;
  const enableSwagger = configService.get('ENABLE_SWAGGER', true);

  // Security middleware
  app.use(helmet());
  app.use(compression());

  // CORS configuration
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Set global API prefix
  app.setGlobalPrefix(apiPrefix);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: process.env.NODE_ENV === 'production',
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  // Global guards - Use the Passport JWT guard instead
  // Guards are applied at the module level in AuthModule
  const reflector = app.get(Reflector);

  // Global interceptors
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(reflector),
    new ResponseInterceptor(),
    new LoggingInterceptor(),
  );

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger documentation
  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Frevo Backend API')
      .setDescription('The Frevo freelancer platform backend API documentation')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag(
        'Authentication',
        'User authentication and authorization endpoints',
      )
      .addTag('Users', 'User management endpoints')
      .addTag('Jobs', 'Job posting and management endpoints')
      .addTag('Proposals', 'Proposal management endpoints')
      .addTag('Contracts', 'Contract management endpoints')
      .addTag('Payments', 'Payment processing endpoints')
      .addTag('Messages', 'Messaging system endpoints')
      .addTag('Reviews', 'Review and rating endpoints')
      .addTag('Admin', 'Administrative endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    console.log(
      `Swagger documentation available at: http://localhost:${port}/${apiPrefix}/docs`,
    );
  }

  await app.listen(port);

  console.log(
    `🚀 Application is running on: http://localhost:${port}/${apiPrefix}`,
  );
  console.log(
    ' API Documentation: http://localhost:' + port + `/${apiPrefix}/docs`,
  );
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap().catch((error) => {
  console.error('Error starting the application:', error);
  process.exit(1);
});
