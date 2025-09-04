import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { RequestMethod } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { CustomValidationPipe } from './common/pipes/custom-validation.pipe';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');

  // Security middleware
  app.use(helmet());

  // HTTPS enforcement in production
  if (configService.get('NODE_ENV') === 'production') {
    app.use((req: any, res: any, next: any) => {
      if (req.header('x-forwarded-proto') !== 'https') {
        res.redirect(`https://${req.header('host')}${req.url}`);
      } else {
        next();
      }
    });
  }

  // Additional security headers
  app.use((req: any, res: any, next: any) => {
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('X-XSS-Protection', '1; mode=block');
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('FreelanceHub API')
    .setDescription(
      'Comprehensive API documentation for FreelanceHub platform - Enhanced with security and performance improvements',
    )
    .setVersion('2.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('projects', 'Project management endpoints')
    .addTag('proposals', 'Proposal management endpoints')
    .addTag('contracts', 'Contract management endpoints')
    .addTag('disputes', 'Dispute resolution endpoints')
    .addTag('payments', 'Payment processing endpoints')
    .addTag('reviews', 'Review and rating endpoints')
    .addTag('admin', 'Administrative endpoints')
    .addTag('storage', 'File storage and upload endpoints')
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
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseInterceptor(), // Standardize API responses
  );

  // Enable CORS with enhanced security
  app.enableCors({
    origin:
      configService.get('app.corsOrigin') ||
      process.env.CORS_ORIGIN ||
      'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Global validation pipe with enhanced settings
  app.useGlobalPipes(new CustomValidationPipe());

  // Body size limit
  app.use(
    require('express').json({
      limit: configService.get('app.maxRequestSize') || '10mb',
    }),
  );
  app.use(
    require('express').urlencoded({
      limit: configService.get('app.maxRequestSize') || '10mb',
      extended: true,
    }),
  );

  const port = configService.get('app.port') || process.env.PORT || 8000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}/api/v1`);
  console.log(
    `📚 Swagger documentation available at: http://localhost:${port}/api/v1/docs`,
  );
  console.log(`🔒 Security headers enabled, rate limiting active`);
}
bootstrap();
