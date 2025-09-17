import { registerAs } from '@nestjs/config';

export default registerAs('stripe', () => ({
  secretKey: process.env.STRIPE_SECRET_KEY,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  currency: process.env.STRIPE_CURRENCY || 'usd',
  // Platform fee percentage (e.g., 0.05 for 5%)
  platformFee: parseFloat(process.env.STRIPE_PLATFORM_FEE || '0.05'),
  // Webhook tolerance in seconds
  webhookTolerance: parseInt(process.env.STRIPE_WEBHOOK_TOLERANCE || '300'),
  // API version
  apiVersion: process.env.STRIPE_API_VERSION || '2023-10-16',
}));