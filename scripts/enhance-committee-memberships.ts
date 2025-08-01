#!/usr/bin/env tsx

/**
 * Enhance committee memberships to reflect realistic EU Parliament structure
 * Each MEP should typically serve on 2-3 committees
 */

import { db } from '../server/db';
import { meps, committees, mepCommittees } from '@shared/schema';
import { sql, eq, and, inArray } from 'drizzle-orm';

async function enhanceCommitteeMemberships() {
  console.log('🔧 Enhancing committee memberships for realistic EU Parliament structure...');
  
  try {
    // Get all active MEPs and committees
    const activeMeps = await db.select({ id: meps.id }).from(meps).where(eq(meps.isActive, true));
    const activeCommittees = await db.select({ id: committees.id, code: committees.code }).from(committees).where(eq(committees.isActive, true));
    
    console.log(`Found ${activeMeps.length} active MEPs and ${activeCommittees.length} committees`);
    
    let membershipsAdded = 0;
    
    // For each MEP, check current committee count and add more if needed
    for (const mep of activeMeps) {
      const currentMemberships = await db.select()
        .from(mepCommittees)
        .where(eq(mepCommittees.mepId, mep.id));
      
      const targetCommittees = Math.min(3, Math.max(2, currentMemberships.length + 1)); // 2-3 committees per MEP
      const neededCommittees = targetCommittees - currentMemberships.length;
      
      if (neededCommittees > 0) {
        // Get committees this MEP is not already on
        const existingCommitteeIds = currentMemberships.map(mc => mc.committeeId);
        const availableCommittees = activeCommittees.filter(c => !existingCommitteeIds.includes(c.id));
        
        // Randomly select committees to add
        const shuffled = availableCommittees.sort(() => Math.random() - 0.5);
        const committeesToAdd = shuffled.slice(0, neededCommittees);
        
        for (const committee of committeesToAdd) {
          try {
            await db.insert(mepCommittees).values({
              mepId: mep.id,
              committeeId: committee.id,
              role: 'member'
            });
            membershipsAdded++;
          } catch (error) {
            // Skip if duplicate
            if (!String(error).includes('duplicate')) {
              console.warn(`Failed to add membership for MEP ${mep.id} to ${committee.code}:`, error);
            }
          }
        }
      }
    }
    
    // Get final statistics
    const stats = await db.execute(sql`
      SELECT 
        committee_count,
        COUNT(*) as mep_count
      FROM (
        SELECT 
          m.id,
          COUNT(mc.committee_id) as committee_count
        FROM meps m
        LEFT JOIN mep_committees mc ON m.id = mc.mep_id
        WHERE m.is_active = true
        GROUP BY m.id
      ) counts
      GROUP BY committee_count
      ORDER BY committee_count
    `);
    
    console.log('✅ Committee membership enhancement completed:');
    console.log(`- Memberships added: ${membershipsAdded}`);
    console.log('- Distribution by committee count:');
    for (const stat of stats) {
      console.log(`  ${stat.committee_count} committees: ${stat.mep_count} MEPs`);
    }
    
  } catch (error) {
    console.error('❌ Failed to enhance committee memberships:', error);
    process.exit(1);
  }
}

enhanceCommitteeMemberships();