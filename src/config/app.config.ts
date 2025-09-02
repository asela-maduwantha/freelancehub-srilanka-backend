import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    return 'dev-secret-change-me-in-production';
  })(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  otpExpiry: parseInt(process.env.OTP_EXPIRY || '600', 10), // 10 minutes
  maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
}));
