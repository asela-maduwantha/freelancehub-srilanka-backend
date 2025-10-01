# Job Status Migration Guide

This guide explains how to migrate your existing database to use the new job status system and enforce the one-job-one-contract rule.

## Why This Migration Is Needed

After deploying the code changes, existing jobs in your database will have outdated status values:
- Jobs with `IN_PROGRESS` status need to be categorized as either `CONTRACTED` or `AWAITING_CONTRACT`
- The new unique index on `contractId` needs to be created
- Any data integrity issues (like duplicate contracts) need to be identified

## Pre-Migration Checklist

✅ **Backup your database** before running the migration  
✅ Ensure all code changes are deployed  
✅ Test in a staging environment first  
✅ Schedule during low-traffic period if possible

## Migration Steps

### Step 1: Preview Changes (Dry Run)

Run a dry run to see what will change **without modifying any data**:

```bash
npm run migrate:job-status -- --dry-run
```

This will show:
- Number of jobs that will be updated to `CONTRACTED`
- Number of jobs that will be updated to `AWAITING_CONTRACT`
- Any issues found (like duplicate contracts)

### Step 2: Run the Migration

Once you've reviewed the dry run results and are satisfied:

```bash
npm run migrate:job-status
```

This will:
1. Update `IN_PROGRESS` jobs with contracts → `CONTRACTED`
2. Update `IN_PROGRESS` jobs without contracts → `AWAITING_CONTRACT`
3. Check for duplicate contracts (warns but doesn't fix)
4. Validate all contract references

### Step 3: Verify Results

After the migration completes:

1. **Check the console output** for any warnings or errors
2. **Review jobs with duplicate contracts** (if any were reported)
3. **Verify in your database**:
   ```javascript
   // MongoDB shell
   db.jobs.find({ status: "contracted" }).count()
   db.jobs.find({ status: "awaiting-contract" }).count()
   ```

## What Gets Updated

### Jobs Updated to `CONTRACTED`
- **Criteria**: Status = `IN_PROGRESS` AND has a `contractId`
- **Meaning**: These jobs have an active contract

### Jobs Updated to `AWAITING_CONTRACT`
- **Criteria**: Status = `IN_PROGRESS` AND no `contractId`
- **Meaning**: Proposal was accepted but contract not yet created

## Handling Issues

### Issue: Duplicate Contracts Found

If the migration reports jobs with multiple contracts:

```
⚠️ Job 507f1f77bcf86cd799439011 has 2 contracts: 507f..., 608g...
```

**What to do**:
1. Manually review each reported job
2. Determine which contract is the "real" one
3. Delete the duplicate contract from the database
4. Update the job's `contractId` to reference the correct contract

### Issue: Invalid Contract References

If jobs reference non-existent contracts:

```
⚠️ Job 507f1f77bcf86cd799439011 has invalid contract reference
```

**What to do**:
1. Either recreate the missing contract
2. Or set the job's `contractId` to `null` and status to `AWAITING_CONTRACT`

## Rollback (Emergency Use Only)

If something goes wrong, you can rollback:

```bash
npm run migrate:job-status -- --rollback
```

⚠️ **WARNING**: This will revert all `CONTRACTED` and `AWAITING_CONTRACT` jobs back to `IN_PROGRESS`

**Better approach**: Restore from your database backup instead of using rollback.

## Adding npm Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "migrate:job-status": "ts-node src/scripts/migrate-job-status.ts"
  }
}
```

## Troubleshooting

### Migration Won't Run

**Error**: "Cannot connect to database"
- **Solution**: Ensure your database connection is configured correctly in `.env`

**Error**: "JobStatusMigrationService not found"
- **Solution**: Make sure the migration service is properly imported in your app module

### Migration Takes Too Long

For very large databases:
- Run during off-peak hours
- Consider running in batches (modify the migration script)
- Increase database connection timeout

### Some Jobs Not Updated

Check that:
- The job actually has `IN_PROGRESS` status
- The `contractId` field exists (or doesn't exist, depending on expected outcome)
- The job hasn't been soft-deleted (`deletedAt` field)

## Post-Migration

After successful migration:

1. **Monitor application logs** for any status-related errors
2. **Test critical workflows**:
   - Accept a proposal
   - Create a contract
   - Complete a job
3. **Update any custom queries** that filter by `IN_PROGRESS` status
4. **Update documentation** to reflect new status workflow

## FAQ

**Q: Will this affect jobs currently being worked on?**  
A: No, the migration only changes status values. Active work continues normally.

**Q: What if I find issues after migration?**  
A: You can manually update job statuses in the database, or restore from backup if critical.

**Q: Do I need to run this multiple times?**  
A: No, once is sufficient. The migration is idempotent (safe to run multiple times) but not necessary.

**Q: What about new jobs created during migration?**  
A: New jobs will use the new status system automatically. The migration only affects existing data.

## Support

If you encounter issues:
1. Check the application logs
2. Review the migration output for specific errors
3. Contact the development team with:
   - Migration output
   - Database state (number of jobs in each status)
   - Any error messages

---

**Last Updated**: October 1, 2025
