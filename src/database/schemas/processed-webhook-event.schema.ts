import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Schema to track processed Stripe webhook events for idempotency.
 * Prevents duplicate processing of the same webhook event.
 * Events are automatically deleted after 30 days using TTL index.
 */
@Schema({
  timestamps: true,
  collection: 'processed_webhook_events',
})
export class ProcessedWebhookEvent extends Document {
  @Prop({ required: true, unique: true, index: true })
  stripeEventId: string;

  @Prop({ required: true, index: true })
  eventType: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: Date.now })
  processedAt: Date;

  @Prop({ type: Date, default: Date.now, expires: 2592000 }) // Auto-delete after 30 days
  expiresAt: Date;
}

export const ProcessedWebhookEventSchema = SchemaFactory.createForClass(ProcessedWebhookEvent);

// Indexes
ProcessedWebhookEventSchema.index({ stripeEventId: 1 }, { unique: true });
ProcessedWebhookEventSchema.index({ eventType: 1 });
ProcessedWebhookEventSchema.index({ processedAt: 1 });
