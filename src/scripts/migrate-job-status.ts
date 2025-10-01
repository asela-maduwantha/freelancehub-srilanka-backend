#!/usr/bin/env node

/**
 * CLI Script to run Job Status Migration
 * 
 * Usage:
 *   npm run migrate:job-status -- --dry-run    # Preview changes
 *   npm run migrate:job-status                  # Run migration
 *   npm run migrate:job-status -- --rollback    # Rollback (use with caution)
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { JobStatusMigrationService } from '../services/migration/job-status-migration.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const migrationService = app.get(JobStatusMigrationService);

  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isRollback = args.includes('--rollback');

  try {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  Job Status Migration Script');
    console.log('═══════════════════════════════════════════════════════\n');

    if (isDryRun) {
      console.log('🔍 Running in DRY RUN mode - no changes will be made\n');
      const result = await migrationService.dryRunMigration();
      
      console.log('📊 Preview of changes:');
      console.log(`   • ${result.willUpdate.toContracted} jobs will be updated to CONTRACTED`);
      console.log(`   • ${result.willUpdate.toAwaitingContract} jobs will be updated to AWAITING_CONTRACT`);
      
      if (result.issues.length > 0) {
        console.log('\n⚠️  Issues found:');
        result.issues.forEach((issue) => console.log(`   • ${issue}`));
      } else {
        console.log('\n✅ No issues found - safe to proceed');
      }
      
      console.log('\n💡 To run the actual migration, execute:');
      console.log('   npm run migrate:job-status\n');
    } else if (isRollback) {
      console.log('⚠️  ROLLBACK MODE - This will undo the migration');
      console.log('⚠️  Are you sure? (This will run in 5 seconds...)\n');
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const result = await migrationService.rollbackMigration();
      
      if (result.success) {
        console.log(`✅ ${result.message}\n`);
      } else {
        console.error(`❌ ${result.message}\n`);
        process.exit(1);
      }
    } else {
      console.log('🚀 Running migration...\n');
      const result = await migrationService.migrateJobStatuses();
      
      console.log('\n📊 Migration Results:');
      console.log(`   • ${result.updated.toContracted} jobs updated to CONTRACTED`);
      console.log(`   • ${result.updated.toAwaitingContract} jobs updated to AWAITING_CONTRACT`);
      console.log(`   • ${result.updated.toClosed} jobs updated to CLOSED`);
      
      if (result.errors.length > 0) {
        console.log('\n⚠️  Errors/Warnings:');
        result.errors.forEach((error) => console.log(`   • ${error}`));
      }
      
      if (result.success) {
        console.log('\n✅ Migration completed successfully!\n');
      } else {
        console.log('\n⚠️  Migration completed with warnings. Please review the errors above.\n');
      }
    }

    console.log('═══════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
