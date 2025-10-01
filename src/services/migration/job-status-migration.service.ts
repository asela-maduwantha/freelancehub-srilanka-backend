/**
 * Migration Script: Update Job Statuses and Enforce Contract Constraints
 * 
 * This script migrates existing jobs to use the new status system and
 * ensures data integrity for the one-job-one-contract rule.
 * 
 * Run this ONCE after deploying the new code changes.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job } from '../../database/schemas/job.schema';
import { Contract } from '../../database/schemas/contract.schema';
import { JobStatus } from '../../common/enums/job-status.enum';

@Injectable()
export class JobStatusMigrationService {
  private readonly logger = new Logger(JobStatusMigrationService.name);

  constructor(
    @InjectModel(Job.name) private jobModel: Model<Job>,
    @InjectModel(Contract.name) private contractModel: Model<Contract>,
  ) {}

  /**
   * Main migration method
   * Call this from a script or admin endpoint
   */
  async migrateJobStatuses(): Promise<{
    success: boolean;
    updated: {
      toContracted: number;
      toAwaitingContract: number;
      toClosed: number;
    };
    errors: string[];
  }> {
    const errors: string[] = [];
    let toContractedCount = 0;
    let toAwaitingContractCount = 0;
    let toClosedCount = 0;

    try {
      this.logger.log('Starting job status migration...');

      // Step 1: Update IN_PROGRESS jobs with contracts to CONTRACTED
      this.logger.log('Step 1: Updating IN_PROGRESS jobs with contracts to CONTRACTED...');
      const contractedResult = await this.jobModel.updateMany(
        {
          status: JobStatus.IN_PROGRESS,
          contractId: { $exists: true, $ne: null },
        },
        {
          $set: { status: JobStatus.CONTRACTED },
        }
      ).exec();
      toContractedCount = contractedResult.modifiedCount;
      this.logger.log(`Updated ${toContractedCount} jobs to CONTRACTED status`);

      // Step 2: Update IN_PROGRESS jobs without contracts to AWAITING_CONTRACT
      this.logger.log('Step 2: Updating IN_PROGRESS jobs without contracts to AWAITING_CONTRACT...');
      const awaitingContractResult = await this.jobModel.updateMany(
        {
          status: JobStatus.IN_PROGRESS,
          $or: [
            { contractId: { $exists: false } },
            { contractId: null }
          ],
        },
        {
          $set: { status: JobStatus.AWAITING_CONTRACT },
        }
      ).exec();
      toAwaitingContractCount = awaitingContractResult.modifiedCount;
      this.logger.log(`Updated ${toAwaitingContractCount} jobs to AWAITING_CONTRACT status`);

      // Step 3: Find jobs with duplicate contracts (if any exist)
      this.logger.log('Step 3: Checking for jobs with duplicate contracts...');
      const duplicateContracts = await this.contractModel.aggregate([
        {
          $group: {
            _id: '$jobId',
            count: { $sum: 1 },
            contracts: { $push: '$_id' }
          }
        },
        {
          $match: {
            count: { $gt: 1 }
          }
        }
      ]).exec();

      if (duplicateContracts.length > 0) {
        this.logger.warn(`Found ${duplicateContracts.length} jobs with multiple contracts!`);
        duplicateContracts.forEach((dup) => {
          errors.push(`Job ${dup._id} has ${dup.count} contracts: ${dup.contracts.join(', ')}`);
        });
        this.logger.warn('Manual intervention required for jobs with multiple contracts');
      } else {
        this.logger.log('No duplicate contracts found - data is clean');
      }

      // Step 4: Validate contract references
      this.logger.log('Step 4: Validating contract references...');
      const jobsWithContracts = await this.jobModel.find({
        contractId: { $exists: true, $ne: null }
      }).exec();

      let invalidReferences = 0;
      for (const job of jobsWithContracts) {
        const contractExists = await this.contractModel.exists({ _id: job.contractId });
        if (!contractExists) {
          this.logger.warn(`Job ${job._id} references non-existent contract ${job.contractId}`);
          errors.push(`Job ${job._id} has invalid contract reference`);
          invalidReferences++;
        }
      }

      if (invalidReferences > 0) {
        this.logger.warn(`Found ${invalidReferences} jobs with invalid contract references`);
      } else {
        this.logger.log('All contract references are valid');
      }

      // Step 5: Optional - Update COMPLETED jobs that should be CLOSED
      // This step is commented out because it requires business logic to determine
      // which completed jobs were actually manually closed vs successfully finished
      // Uncomment and modify if needed
      /*
      this.logger.log('Step 5: Checking for jobs that should be CLOSED instead of COMPLETED...');
      const closedJobsResult = await this.jobModel.updateMany(
        {
          status: JobStatus.COMPLETED,
          contractId: { $exists: false }, // No contract = manually closed, not completed
        },
        {
          $set: { status: JobStatus.CLOSED },
        }
      ).exec();
      toClosedCount = closedJobsResult.modifiedCount;
      this.logger.log(`Updated ${toClosedCount} jobs to CLOSED status`);
      */

      this.logger.log('Migration completed successfully!');
      this.logger.log(`Summary:
        - Jobs updated to CONTRACTED: ${toContractedCount}
        - Jobs updated to AWAITING_CONTRACT: ${toAwaitingContractCount}
        - Jobs updated to CLOSED: ${toClosedCount}
        - Errors/Warnings: ${errors.length}
      `);

      return {
        success: errors.length === 0,
        updated: {
          toContracted: toContractedCount,
          toAwaitingContract: toAwaitingContractCount,
          toClosed: toClosedCount,
        },
        errors,
      };
    } catch (error) {
      this.logger.error('Migration failed:', error);
      errors.push(`Migration error: ${error.message}`);
      return {
        success: false,
        updated: {
          toContracted: toContractedCount,
          toAwaitingContract: toAwaitingContractCount,
          toClosed: toClosedCount,
        },
        errors,
      };
    }
  }

  /**
   * Rollback method (if needed)
   * WARNING: Use with caution
   */
  async rollbackMigration(): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.warn('Rolling back job status migration...');

      // Rollback CONTRACTED and AWAITING_CONTRACT to IN_PROGRESS
      const rollbackResult = await this.jobModel.updateMany(
        {
          status: { $in: [JobStatus.CONTRACTED, JobStatus.AWAITING_CONTRACT] }
        },
        {
          $set: { status: JobStatus.IN_PROGRESS }
        }
      ).exec();

      this.logger.log(`Rolled back ${rollbackResult.modifiedCount} jobs to IN_PROGRESS`);

      return {
        success: true,
        message: `Successfully rolled back ${rollbackResult.modifiedCount} jobs`
      };
    } catch (error) {
      this.logger.error('Rollback failed:', error);
      return {
        success: false,
        message: `Rollback failed: ${error.message}`
      };
    }
  }

  /**
   * Dry run method - preview changes without committing
   */
  async dryRunMigration(): Promise<{
    willUpdate: {
      toContracted: number;
      toAwaitingContract: number;
    };
    issues: string[];
  }> {
    const issues: string[] = [];

    // Count jobs that will be updated to CONTRACTED
    const toContractedCount = await this.jobModel.countDocuments({
      status: JobStatus.IN_PROGRESS,
      contractId: { $exists: true, $ne: null },
    }).exec();

    // Count jobs that will be updated to AWAITING_CONTRACT
    const toAwaitingContractCount = await this.jobModel.countDocuments({
      status: JobStatus.IN_PROGRESS,
      $or: [
        { contractId: { $exists: false } },
        { contractId: null }
      ],
    }).exec();

    // Check for duplicate contracts
    const duplicateContracts = await this.contractModel.aggregate([
      {
        $group: {
          _id: '$jobId',
          count: { $sum: 1 },
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]).exec();

    if (duplicateContracts.length > 0) {
      issues.push(`${duplicateContracts.length} jobs have multiple contracts - manual review needed`);
    }

    this.logger.log(`Dry run results:
      - Will update ${toContractedCount} jobs to CONTRACTED
      - Will update ${toAwaitingContractCount} jobs to AWAITING_CONTRACT
      - Found ${issues.length} issues
    `);

    return {
      willUpdate: {
        toContracted: toContractedCount,
        toAwaitingContract: toAwaitingContractCount,
      },
      issues,
    };
  }
}
