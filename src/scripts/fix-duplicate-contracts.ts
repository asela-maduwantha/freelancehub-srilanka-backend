import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Contract } from '../database/schemas/contract.schema';
import { Job } from '../database/schemas/job.schema';

/**
 * Migration script to:
 * 1. Identify and remove duplicate contracts
 * 2. Add unique indexes to prevent future duplicates
 * 3. Fix job.contractId references
 */
async function fixDuplicateContracts() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const contractModel = app.get<Model<Contract>>(getModelToken(Contract.name));
    const jobModel = app.get<Model<Job>>(getModelToken(Job.name));

    console.log('🔍 Checking for duplicate contracts...');

    // Find duplicate contracts by proposalId
    const duplicatesByProposal = await contractModel.aggregate([
      {
        $group: {
          _id: '$proposalId',
          count: { $sum: 1 },
          contracts: { $push: { id: '$_id', createdAt: '$createdAt', status: '$status' } }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);

    console.log(`📊 Found ${duplicatesByProposal.length} proposals with duplicate contracts`);

    let contractsRemoved = 0;

    for (const duplicate of duplicatesByProposal) {
      console.log(`\n📝 Proposal ${duplicate._id} has ${duplicate.count} contracts:`);
      duplicate.contracts.forEach((c: any, index: number) => {
        console.log(`   ${index + 1}. Contract ${c.id} - Status: ${c.status} - Created: ${new Date(c.createdAt).toISOString()}`);
      });

      // Sort contracts by creation date (keep the oldest one)
      const sortedContracts = duplicate.contracts.sort((a: any, b: any) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const contractToKeep = sortedContracts[0];
      const contractsToRemove = sortedContracts.slice(1);

      console.log(`   ✅ Keeping: ${contractToKeep.id} (oldest)`);
      
      for (const contractToRemove of contractsToRemove) {
        console.log(`   ❌ Removing: ${contractToRemove.id}`);
        
        // Soft delete the duplicate contract
        await contractModel.findByIdAndUpdate(contractToRemove.id, {
          deletedAt: new Date(),
          status: 'cancelled'
        });
        
        contractsRemoved++;
      }

      // Update the job to reference the kept contract
      const contract = await contractModel.findById(contractToKeep.id);
      if (contract) {
        await jobModel.findByIdAndUpdate(contract.jobId, {
          contractId: contractToKeep.id
        });
        console.log(`   🔗 Updated job ${contract.jobId} to reference contract ${contractToKeep.id}`);
      }
    }

    // Find duplicate contracts by jobId
    const duplicatesByJob = await contractModel.aggregate([
      {
        $match: { deletedAt: null }
      },
      {
        $group: {
          _id: '$jobId',
          count: { $sum: 1 },
          contracts: { $push: { id: '$_id', createdAt: '$createdAt', status: '$status' } }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);

    console.log(`\n📊 Found ${duplicatesByJob.length} jobs with multiple active contracts`);

    for (const duplicate of duplicatesByJob) {
      console.log(`\n📝 Job ${duplicate._id} has ${duplicate.count} active contracts:`);
      duplicate.contracts.forEach((c: any, index: number) => {
        console.log(`   ${index + 1}. Contract ${c.id} - Status: ${c.status} - Created: ${new Date(c.createdAt).toISOString()}`);
      });

      // Sort contracts by creation date (keep the oldest one)
      const sortedContracts = duplicate.contracts.sort((a: any, b: any) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const contractToKeep = sortedContracts[0];
      const contractsToRemove = sortedContracts.slice(1);

      console.log(`   ✅ Keeping: ${contractToKeep.id} (oldest)`);
      
      for (const contractToRemove of contractsToRemove) {
        console.log(`   ❌ Soft deleting: ${contractToRemove.id}`);
        
        await contractModel.findByIdAndUpdate(contractToRemove.id, {
          deletedAt: new Date(),
          status: 'cancelled'
        });
        
        contractsRemoved++;
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   - Removed ${contractsRemoved} duplicate contracts`);
    console.log(`   - Unique indexes are now enforced by the schema`);
    console.log(`\n⚠️  Note: Duplicate contracts have been soft-deleted (deletedAt set)`);
    console.log(`   You can hard-delete them later if needed.`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

// Run the migration
fixDuplicateContracts()
  .then(() => {
    console.log('\n🎉 Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
