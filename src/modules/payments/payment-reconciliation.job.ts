import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment } from '../../database/schemas/payment.schema';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { StripeService } from '../../services/stripe/stripe.service';
import { PaymentService } from '../payments/payments.service';

/**
 * Payment Reconciliation Job
 * 
 * This cron job runs daily to detect and fix inconsistencies between
 * Stripe and the database. It helps recover from:
 * - Missed webhook events
 * - Network failures during webhook processing
 * - Database update failures
 * - Stuck payments in PENDING status
 */
@Injectable()
export class PaymentReconciliationJob {
  private readonly logger = new Logger(PaymentReconciliationJob.name);

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    private stripeService: StripeService,
    private paymentService: PaymentService,
  ) {}

  /**
   * Run reconciliation daily at 2 AM
   * Checks for payments stuck in PENDING status for more than 24 hours
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async reconcileStuckPayments() {
    this.logger.log('Starting payment reconciliation job...');

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let reconciledCount = 0;
    let failedCount = 0;

    try {
      // Find payments stuck in PENDING or PROCESSING status for > 24 hours
      const stuckPayments = await this.paymentModel.find({
        status: { $in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
        createdAt: { $lt: yesterday },
        deletedAt: null,
      }).exec();

      this.logger.log(`Found ${stuckPayments.length} stuck payments to reconcile`);

      for (const payment of stuckPayments) {
        try {
          if (!payment.stripePaymentIntentId) {
            this.logger.warn(
              `Payment ${payment._id} has no Stripe Payment Intent ID, skipping`
            );
            continue;
          }

          // Check actual status in Stripe
          const stripePI = await this.stripeService.retrievePaymentIntent(
            payment.stripePaymentIntentId
          );

          this.logger.log(
            `Payment ${payment._id}: DB status=${payment.status}, Stripe status=${stripePI.status}`
          );

          // Reconcile based on Stripe status
          if (stripePI.status === 'succeeded') {
            // Stripe says succeeded, but DB says pending - FIX IT
            this.logger.warn(
              `RECONCILIATION: Payment ${payment._id} succeeded in Stripe but stuck in DB`
            );

            // Get charge details for completion
            const charges = (stripePI as any).charges?.data || [];
            const chargeId = charges[0]?.id;
            const stripeFee = charges[0]?.balance_transaction?.fee || 0;

            await this.paymentService.completePayment(
              String(payment._id),
              stripePI.id,
              chargeId,
              undefined,
              stripeFee
            );

            reconciledCount++;
            this.logger.log(`✅ Successfully reconciled payment ${payment._id}`);

          } else if (stripePI.status === 'canceled' || stripePI.status === 'failed') {
            // Mark as failed in database
            this.logger.warn(
              `RECONCILIATION: Payment ${payment._id} ${stripePI.status} in Stripe`
            );

            const errorMessage =
              (stripePI as any).last_payment_error?.message ||
              `Payment ${stripePI.status} - detected by reconciliation`;

            await this.paymentService.failPayment(
              String(payment._id),
              errorMessage
            );

            reconciledCount++;
            this.logger.log(`✅ Marked payment ${payment._id} as failed`);

          } else if (stripePI.status === 'requires_payment_method') {
            // Payment needs new payment method
            this.logger.warn(
              `Payment ${payment._id} requires new payment method - auto-failing`
            );

            await this.paymentService.failPayment(
              String(payment._id),
              'Payment requires new payment method'
            );

            reconciledCount++;

          } else {
            // Payment is still processing in Stripe (requires_action, etc.)
            this.logger.log(
              `Payment ${payment._id} still processing in Stripe (${stripePI.status}), leaving as-is`
            );
          }

        } catch (error) {
          failedCount++;
          this.logger.error(
            `Failed to reconcile payment ${payment._id}: ${error.message}`,
            error.stack
          );
        }
      }

      this.logger.log(
        `Payment reconciliation completed: ${reconciledCount} reconciled, ${failedCount} failed`
      );

      // Alert if there were failures
      if (failedCount > 0) {
        // TODO: Send alert to admin/ops team
        this.logger.error(
          `⚠️  ALERT: ${failedCount} payments failed to reconcile - manual intervention may be needed`
        );
      }

    } catch (error) {
      this.logger.error(
        `Payment reconciliation job failed: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * Check for failed balance updates and retry them
   * Runs every 6 hours
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async retryFailedBalanceUpdates() {
    this.logger.log('Starting failed balance update retry job...');

    try {
      const FailedBalanceUpdate = this.paymentModel.db.model('FailedBalanceUpdate');

      // Find pending failed balance updates with retry count < 5
      const failedUpdates = await FailedBalanceUpdate.find({
        status: 'pending',
        retryCount: { $lt: 5 },
      })
        .sort({ createdAt: 1 }) // Oldest first
        .limit(50) // Process 50 at a time
        .exec();

      this.logger.log(`Found ${failedUpdates.length} failed balance updates to retry`);

      let successCount = 0;
      let failureCount = 0;

      for (const failedUpdate of failedUpdates) {
        try {
          // Update balance using atomic operation
          const User = this.paymentModel.db.model('User');
          const result = await User.findByIdAndUpdate(
            failedUpdate.freelancerId,
            {
              $inc: {
                'freelancerData.pendingBalance': failedUpdate.amount,
              },
            },
            { new: true }
          );

          if (result) {
            // Mark as completed
            failedUpdate.status = 'completed';
            failedUpdate.completedAt = new Date();
            await failedUpdate.save();

            successCount++;
            this.logger.log(
              `✅ Successfully retried balance update for payment ${failedUpdate.paymentId}`
            );
          } else {
            throw new Error('User not found');
          }

        } catch (error) {
          failureCount++;

          // Increment retry count
          failedUpdate.retryCount += 1;
          failedUpdate.lastRetryAt = new Date();
          failedUpdate.error = error.message;

          // Mark as failed if max retries reached
          if (failedUpdate.retryCount >= 5) {
            failedUpdate.status = 'failed';
            this.logger.error(
              `❌ Max retries reached for balance update ${failedUpdate._id} - marking as permanently failed`
            );
          }

          await failedUpdate.save();

          this.logger.error(
            `Failed to retry balance update ${failedUpdate._id}: ${error.message}`
          );
        }
      }

      this.logger.log(
        `Failed balance update retry completed: ${successCount} succeeded, ${failureCount} failed`
      );

    } catch (error) {
      this.logger.error(
        `Failed balance update retry job failed: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * Generate reconciliation report (runs weekly)
   * Useful for auditing and detecting patterns
   */
  @Cron(CronExpression.EVERY_WEEK)
  async generateReconciliationReport() {
    this.logger.log('Generating weekly payment reconciliation report...');

    try {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Get payment statistics
      const stats = await this.paymentModel.aggregate([
        {
          $match: {
            createdAt: { $gte: oneWeekAgo },
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
          },
        },
      ]);

      // Get stuck payments count
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const stuckCount = await this.paymentModel.countDocuments({
        status: { $in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
        createdAt: { $lt: yesterday },
        deletedAt: null,
      });

      // Get failed balance updates count
      const FailedBalanceUpdate = this.paymentModel.db.model('FailedBalanceUpdate');
      const failedBalanceCount = await FailedBalanceUpdate.countDocuments({
        status: { $in: ['pending', 'failed'] },
      });

      // Log report
      this.logger.log('===== WEEKLY PAYMENT RECONCILIATION REPORT =====');
      this.logger.log(`Period: Last 7 days`);
      this.logger.log(`\nPayment Statistics:`);
      stats.forEach((stat) => {
        this.logger.log(
          `  ${stat._id}: ${stat.count} payments, $${stat.totalAmount.toFixed(2)}`
        );
      });
      this.logger.log(`\nIssues:`);
      this.logger.log(`  Stuck payments (>24h): ${stuckCount}`);
      this.logger.log(`  Failed balance updates: ${failedBalanceCount}`);
      this.logger.log('================================================');

      // Alert if critical issues
      if (stuckCount > 10 || failedBalanceCount > 5) {
        this.logger.error(
          `⚠️  ALERT: High number of payment issues detected - immediate attention required`
        );
        // TODO: Send email/Slack alert to ops team
      }

    } catch (error) {
      this.logger.error(
        `Failed to generate reconciliation report: ${error.message}`,
        error.stack
      );
    }
  }
}
