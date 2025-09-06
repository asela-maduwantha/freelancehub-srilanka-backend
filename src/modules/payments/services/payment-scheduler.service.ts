import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentsService } from './payments.service';

@Injectable()
export class PaymentSchedulerService {
  private readonly logger = new Logger(PaymentSchedulerService.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  // Run every minute to check for auto-releases
  @Cron(CronExpression.EVERY_MINUTE)
  async handleAutoReleaseCron() {
    try {
      this.logger.debug('Checking for auto-releases...');

      const result = await this.paymentsService.processAutoReleases();

      if (result.processed > 0) {
        this.logger.log(`Auto-released ${result.processed} payments`);
      }

      if (result.errors.length > 0) {
        this.logger.error('Auto-release errors:', result.errors);
      }
    } catch (error) {
      this.logger.error('Auto-release cron job failed:', error);
    }
  }

  // Also run every 5 minutes as a backup
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleAutoReleaseBackup() {
    try {
      this.logger.debug('Running backup auto-release check...');

      const result = await this.paymentsService.processAutoReleases();

      if (result.processed > 0) {
        this.logger.log(`Backup auto-release processed ${result.processed} payments`);
      }
    } catch (error) {
      this.logger.error('Backup auto-release failed:', error);
    }
  }
}
