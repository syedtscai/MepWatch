#!/usr/bin/env tsx

/**
 * Script to clean up MEP data and ensure only 720 current active MEPs
 */

import { db } from '../server/db';
import { meps, mepCommittees } from '@shared/schema';
import { sql, eq, and, desc } from 'drizzle-orm';

async function main() {
  try {
    console.log('🧹 Starting MEP data cleanup...');
    
    // Step 1: Find and remove duplicate MEPs (keep most recent)
    console.log('🔍 Finding duplicate MEPs...');
    
    const duplicates = await db.execute(sql`
      SELECT 
        CONCAT(first_name, ' ', last_name) as full_name,
        COUNT(*) as count,
        array_agg(id ORDER BY created_at DESC) as ids
      FROM meps 
      GROUP BY CONCAT(first_name, ' ', last_name) 
      HAVING COUNT(*) > 1
    `);
    
    console.log(`Found ${duplicates.length} sets of duplicate MEPs`);
    
    let removedCount = 0;
    for (const duplicate of duplicates) {
      const ids = duplicate.ids as string[];
      const keepId = ids[0]; // Keep the most recent one
      const removeIds = ids.slice(1); // Remove the rest
      
      console.log(`Removing ${removeIds.length} duplicates for ${duplicate.full_name}, keeping ${keepId}`);
      
      // Remove committee memberships for duplicates first
      for (const removeId of removeIds) {
        await db.delete(mepCommittees).where(eq(mepCommittees.mepId, removeId));
      }
      
      // Remove duplicate MEPs
      for (const removeId of removeIds) {
        await db.delete(meps).where(eq(meps.id, removeId));
        removedCount++;
      }
    }
    
    // Step 2: Count remaining MEPs
    const remainingCount = await db.execute(sql`SELECT COUNT(*) as count FROM meps WHERE is_active = true`);
    const currentCount = remainingCount[0].count;
    
    console.log(`Current active MEPs: ${currentCount}`);
    
    // Step 3: If we have more than 720, deactivate oldest entries
    if (currentCount > 720) {
      const excess = currentCount - 720;
      console.log(`Deactivating ${excess} oldest MEP entries to reach 720...`);
      
      await db.execute(sql`
        UPDATE meps 
        SET is_active = false 
        WHERE id IN (
          SELECT id FROM meps 
          WHERE is_active = true 
          ORDER BY created_at ASC 
          LIMIT ${excess}
        )
      `);
    }
    
    // Step 4: Final count
    const finalCount = await db.execute(sql`SELECT COUNT(*) as count FROM meps WHERE is_active = true`);
    const final = finalCount[0].count;
    
    console.log(`✅ Cleanup completed:`);
    console.log(`- Removed ${removedCount} duplicate MEPs`);
    console.log(`- Final active MEPs: ${final}`);
    console.log(`- Target: 720 active MEPs`);
    
    if (final > 720) {
      console.log(`⚠️  Still ${final - 720} MEPs over target. Manual review may be needed.`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

main();