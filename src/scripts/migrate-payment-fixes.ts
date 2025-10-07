/**
 * Database Migration Script
 * Adds new fields to existing collections for payment processing fixes
 * 
 * Run this script after deploying the code changes
 * Usage: npx ts-node src/scripts/migrate-payment-fixes.ts
 */

import { MongoClient } from 'mongodb';

async function migratePaymentFixes() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/freelancehub';
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();

    // 1. Add chargeId field to transaction_logs collection
    console.log('\n1. Updating transaction_logs collection...');
    const txLogsResult = await db.collection('transaction_logs').updateMany(
      { chargeId: { $exists: false } },
      {
        $set: {
          chargeId: null
        }
      }
    );
    console.log(`   Updated ${txLogsResult.modifiedCount} transaction logs`);

    // 2. Add webhook tracking fields to payments collection
    console.log('\n2. Updating payments collection...');
    const paymentsResult = await db.collection('payments').updateMany(
      { lastWebhookId: { $exists: false } },
      {
        $set: {
          lastWebhookId: null,
          lastWebhookType: null,
          lastWebhookAt: null
        }
      }
    );
    console.log(`   Updated ${paymentsResult.modifiedCount} payments`);

    // 3. Add status tracking fields to processed_webhook_events collection
    console.log('\n3. Updating processed_webhook_events collection...');
    const webhookResult = await db.collection('processed_webhook_events').updateMany(
      { status: { $exists: false } },
      {
        $set: {
          status: 'completed',
          startedAt: null,
          errorMessage: null
        }
      }
    );
    console.log(`   Updated ${webhookResult.modifiedCount} webhook events`);

    // 4. Create indexes for new fields
    console.log('\n4. Creating indexes...');
    
    await db.collection('payments').createIndex({ lastWebhookAt: 1 });
    console.log('   Created index on payments.lastWebhookAt');

    await db.collection('processed_webhook_events').createIndex({ status: 1 });
    console.log('   Created index on processed_webhook_events.status');

    // 5. Verify migration
    console.log('\n5. Verifying migration...');
    
    const sampleTxLog = await db.collection('transaction_logs').findOne({});
    console.log('   Sample transaction log has chargeId field:', 'chargeId' in (sampleTxLog || {}));

    const samplePayment = await db.collection('payments').findOne({});
    console.log('   Sample payment has lastWebhookId field:', 'lastWebhookId' in (samplePayment || {}));

    const sampleWebhook = await db.collection('processed_webhook_events').findOne({});
    console.log('   Sample webhook event has status field:', 'status' in (sampleWebhook || {}));

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run migration
if (require.main === module) {
  migratePaymentFixes().catch(console.error);
}

export { migratePaymentFixes };
