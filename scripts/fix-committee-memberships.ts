#!/usr/bin/env tsx

/**
 * Script to fix missing committee membership data
 */

import { committeeMembershipFixer } from '../server/utils/committeeMembershipFixer';

async function main() {
  try {
    console.log('Starting committee membership fix...');
    const result = await committeeMembershipFixer.fixMissingMemberships();
    
    console.log(`\n✅ Fix completed:`);
    console.log(`- Memberships created: ${result.membershipsCreated}`);
    console.log(`- Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
}

main();