#!/usr/bin/env tsx

/**
 * Fix missing political group data by re-processing OpenSanctions data properly
 */

import { openSanctionsAPI } from '../server/services/openSanctionsApi';
import { db } from '../server/db';
import { meps } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

async function fixPoliticalGroupData() {
  console.log('🔧 Fixing political group data from OpenSanctions...');
  
  try {
    // Fetch fresh data from OpenSanctions
    const openSanctionsMEPs = await openSanctionsAPI.fetchAllMEPs();
    console.log(`Processing ${openSanctionsMEPs.length} MEPs from OpenSanctions...`);
    
    let updatedCount = 0;
    
    for (const osMEP of openSanctionsMEPs) {
      try {
        const mepId = osMEP.id.replace('eu-meps-', '');
        
        // Extract political group from membershipMember data
        let politicalGroup = '';
        let politicalGroupAbbr = '';
        
        if (osMEP.properties?.membershipMember) {
          for (const membership of osMEP.properties.membershipMember) {
            if (membership.properties?.organization) {
              for (const org of membership.properties.organization) {
                const orgName = org.caption || '';
                
                // Check if this is a political group (not national party)
                if (orgName.includes('Group') && (
                  orgName.includes('European') || 
                  orgName.includes('Progressive') ||
                  orgName.includes('Renew') ||
                  orgName.includes('Identity') ||
                  orgName.includes('Conservatives') ||
                  orgName.includes('Greens') ||
                  orgName.includes('Left') ||
                  orgName.includes('Patriots') ||
                  orgName.includes('Sovereign')
                )) {
                  politicalGroup = orgName;
                  politicalGroupAbbr = extractPoliticalGroupAbbr(orgName);
                  break;
                }
              }
              if (politicalGroup) break;
            }
          }
        }
        
        // Update MEP with political group info if found
        if (politicalGroup) {
          await db.update(meps)
            .set({ 
              politicalGroup,
              politicalGroupAbbr 
            })
            .where(eq(meps.id, mepId));
          
          updatedCount++;
          if (updatedCount % 50 === 0) {
            console.log(`Updated ${updatedCount} MEPs...`);
          }
        }
        
      } catch (error) {
        console.error(`Failed to update MEP ${osMEP.id}:`, error);
      }
    }
    
    // Get final statistics
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN political_group != '' AND political_group IS NOT NULL THEN 1 END) as with_groups,
        COUNT(CASE WHEN political_group = '' OR political_group IS NULL THEN 1 END) as without_groups
      FROM meps 
      WHERE is_active = true
    `);
    
    console.log('✅ Political group fix completed:');
    console.log(`- Total active MEPs: ${stats[0].total}`);
    console.log(`- MEPs with political groups: ${stats[0].with_groups}`);
    console.log(`- MEPs without political groups: ${stats[0].without_groups}`);
    console.log(`- Updated: ${updatedCount} MEPs`);
    
  } catch (error) {
    console.error('❌ Failed to fix political groups:', error);
  }
}

function extractPoliticalGroupAbbr(groupName: string): string {
  const abbrevMap: Record<string, string> = {
    'European People\'s Party': 'EPP',
    'Progressive Alliance of Socialists and Democrats': 'S&D',
    'Renew Europe': 'RE',
    'Identity and Democracy': 'ID', 
    'European Conservatives and Reformists': 'ECR',
    'Greens–European Free Alliance': 'Greens/EFA',
    'The Left in the European Parliament': 'GUE/NGL',
    'Patriots for Europe': 'PfE',
    'Europe of Sovereign Nations': 'ESN',
    'Non-attached Members': 'NI'
  };
  
  for (const [fullName, abbr] of Object.entries(abbrevMap)) {
    if (groupName.includes(fullName) || groupName.includes(abbr)) {
      return abbr;
    }
  }
  
  // Extract first letters as fallback
  return groupName.split(' ')
    .filter(word => word.length > 2)
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 6);
}

fixPoliticalGroupData();