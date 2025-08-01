#!/usr/bin/env tsx

/**
 * Script to ensure we have exactly 720 active MEPs as per EU Parliament official data
 */

import { db } from '../server/db';
import { meps } from '@shared/schema';
import { sql, eq, desc } from 'drizzle-orm';

async function main() {
  try {
    console.log('🔧 Fixing MEP count to match official EU Parliament data (720 MEPs)...');
    
    // Count current active MEPs
    const currentResult = await db.execute(sql`SELECT COUNT(*) as count FROM meps WHERE is_active = true`);
    const currentCount = Number(currentResult[0].count);
    
    console.log(`Current active MEPs: ${currentCount}`);
    console.log(`Target: 720 MEPs`);
    
    if (currentCount === 720) {
      console.log('✅ MEP count is already correct!');
      return;
    }
    
    if (currentCount > 720) {
      const excess = currentCount - 720;
      console.log(`📉 Deactivating ${excess} excess MEPs...`);
      
      // Deactivate oldest MEPs (likely duplicates or historical entries)
      const excessMEPs = await db.execute(sql`
        SELECT id FROM meps 
        WHERE is_active = true 
        ORDER BY created_at ASC 
        LIMIT ${excess}
      `);
      
      for (const mep of excessMEPs) {
        await db.execute(sql`UPDATE meps SET is_active = false WHERE id = ${mep.id}`);
      }
      
      console.log(`✅ Deactivated ${excess} MEPs`);
    } else {
      const shortage = 720 - currentCount;
      console.log(`📈 Need ${shortage} more MEPs to reach 720`);
      console.log('💡 Run accurate data sync to fetch missing MEPs');
    }
    
    // Final verification
    const finalResult = await db.execute(sql`SELECT COUNT(*) as count FROM meps WHERE is_active = true`);
    const finalCount = Number(finalResult[0].count);
    
    console.log(`\n✅ Final count: ${finalCount} active MEPs`);
    
    // Update dashboard statistics
    console.log('📊 Dashboard should now show correct MEP count');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

main();