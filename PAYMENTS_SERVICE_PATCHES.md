/**
 * CODE PATCH FOR payments.service.ts
 * 
 * This file contains the code changes needed for payments.service.ts
 * Apply these changes manually to avoid file corruption
 */

// =====================================================
// PATCH 1: Update Constructor (around line 65)
// =====================================================
// ADD these two lines after the @InjectModel(Proposal.name) line:
/*
    @InjectModel('ProcessedWebhookEvent') private processedWebhookEventModel: Model<any>,
    @InjectModel('FailedBalanceUpdate') private failedBalanceUpdateModel: Model<any>,
*/

// =====================================================
// PATCH 2: Update handleStripeWebhook Method (around line 955)
// =====================================================
// REPLACE the method signature and first part:
/*
OLD:
  async handleStripeWebhook(
    webhookData: StripeWebhookDto,
    rawBody: string,
    signature: string
  ): Promise<{ received: boolean }> {

NEW:
  async handleStripeWebhook(
    webhookData: StripeWebhookDto,
    rawBody: string,
    signature: string
  ): Promise<{ received: boolean; skipped?: boolean }> {
*/

// =====================================================
// PATCH 3: Add Idempotency Check (around line 978, after event construction)
// =====================================================
// ADD this code after: const { type, data } = event;
/*
      const { type, data, id: eventId } = event;  // MODIFY this line

      // IDEMPOTENCY CHECK: Verify if this event has already been processed
      const existingEvent = await this.processedWebhookEventModel.findOne({ stripeEventId: eventId });
      if (existingEvent) {
        this.logger.log(`Webhook event ${eventId} (${type}) already processed at ${existingEvent.processedAt}, skipping`);
        return { received: true, skipped: true };
      }

      this.logger.log(`Processing Stripe webhook: ${type} (Event ID: ${eventId})`);
*/

// =====================================================
// PATCH 4: Mark Event as Processed (around line 1035, before "return { received: true }")
// =====================================================
// ADD this code before the final return statement:
/*
      // Mark event as processed to prevent duplicate processing
      await this.processedWebhookEventModel.create({
        stripeEventId: eventId,
        eventType: type,
        processedAt: new Date(),
        metadata: {
          objectId: data?.object?.id,
        }
      });

      this.logger.log(`Successfully processed and recorded webhook event ${eventId} (${type})`);
*/

// =====================================================
// PATCH 5: Add Transaction Support to completePayment (around line 507)
// =====================================================
// This is complex - see TRANSACTION_PATCH.md for detailed instructions

/**
 * The completePayment method needs to be wrapped in a MongoDB transaction.
 * Key changes:
 * 1. Start session and transaction
 * 2. Pass session to all findByIdAndUpdate calls
 * 3. Use atomic $inc for balance updates
 * 4. Use $set and $inc for contract updates  
 * 5. Catch errors and rollback transaction
 * 6. Log failed balance updates to FailedBalanceUpdate collection
 * 7. Commit transaction on success
 * 8. Move non-critical operations (logging, notifications) outside transaction
 */

// =====================================================
// PATCH 6: Add Error Recovery for Balance Updates (inside completePayment catch block)
// =====================================================
/*
    } catch (error) {
      // Rollback transaction on any error
      await session.abortTransaction();
      this.logger.error(`Transaction rolled back for payment ${id}: ${error.message}`, error.stack);

      // If balance update failed, log for manual reconciliation
      if (error.message.includes('balance')) {
        try {
          await this.failedBalanceUpdateModel.create({
            paymentId: payment._id,
            freelancerId: payment.payeeId,
            amount: payment.amount - payment.platformFee,
            currency: payment.currency,
            error: error.message,
            status: 'pending',
            retryCount: 0,
            metadata: {
              stripePaymentIntentId,
              stripeChargeId,
            }
          });
          this.logger.error(`CRITICAL: Logged failed balance update for payment ${payment._id} - requires manual reconciliation`);
        } catch (logError) {
          this.logger.error(`Failed to log failed balance update: ${logError.message}`);
        }
      }

      throw error;
    } finally {
      session.endSession();
    }
*/
