#!/usr/bin/env tsx

/**
 * Script to sync data from accurate sources (OpenSanctions + EU Parliament APIs)
 */

import { accurateDataSync } from '../server/services/accurateDataSync';

async function main() {
  try {
    console.log('🚀 Starting accurate data synchronization...');
    const result = await accurateDataSync.syncAccurateData();
    
    console.log(`\n✅ Sync completed:`);
    console.log(`- MEPs created: ${result.mepsCreated}`);
    console.log(`- MEPs updated: ${result.mepsUpdated}`);
    console.log(`- Committee memberships created: ${result.membershipsCreated}`);
    console.log(`- Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

main();