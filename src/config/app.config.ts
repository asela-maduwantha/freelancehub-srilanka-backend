import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8000', 10),
  apiPrefix: process.env.API_PREFIX || 'api',
  corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*'], 
  enableSwagger: process.env.ENABLE_SWAGGER !== 'false',
  logLevel: process.env.LOG_LEVEL?.split(',') || ['error', 'warn', 'log'],
}));
