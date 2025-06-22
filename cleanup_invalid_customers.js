import { marketingStorage } from './server/storage-mktg.js';

console.log('🧹 Starting cleanup of customers with invalid names...');

try {
  const result = await marketingStorage.cleanupInvalidCustomerNames();
  console.log('✅ Cleanup completed successfully:');
  console.log(`   - Removed ${result.removed} customers`);
  
  if (result.details.length > 0) {
    console.log('   - Details:');
    result.details.forEach(detail => {
      console.log(`     • Campaign ${detail.campaignId}: "${detail.customerName}" (Opportunity ${detail.opportunityId})`);
    });
  }
  
  process.exit(0);
} catch (error) {
  console.error('❌ Cleanup failed:', error);
  process.exit(1);
}