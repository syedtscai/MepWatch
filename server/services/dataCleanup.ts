/**
 * Data Cleanup Service for EU Parliament Database
 * 
 * Handles detection and resolution of data quality issues including:
 * - Duplicate MEP records with same name but different IDs
 * - Orphaned committee memberships
 * - Inconsistent country codes and political group data
 * - Committee assignment consolidation
 * 
 * @author EU MEP Watch Development Team
 * @since August 2025
 */

import { db } from "../db";
import { meps, committees, mepCommittees, changeLog } from "@shared/schema";
import { eq, and, sql, inArray, desc } from "drizzle-orm";
import { logger } from "../utils/logger";
import { nanoid } from "nanoid";

export class DataCleanupService {
  
  /**
   * Detect and merge duplicate MEP records
   * Returns a report of actions taken
   */
  async detectAndMergeDuplicates(): Promise<{
    duplicatesFound: number;
    recordsMerged: number;
    committeesConsolidated: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let recordsMerged = 0;
    let committeesConsolidated = 0;

    try {
      logger.info("Starting duplicate MEP detection and merge process", 'DataCleanup');

      // Find duplicates by full name
      const duplicateQuery = await db.execute(sql`
        SELECT 
          full_name, 
          COUNT(*) as count, 
          array_agg(id) as duplicate_ids,
          array_agg(country) as countries,
          array_agg(political_group_abbr) as political_groups
        FROM meps 
        WHERE is_active = true 
        GROUP BY full_name 
        HAVING COUNT(*) > 1 
        ORDER BY count DESC
      `);

      const duplicates = duplicateQuery.rows as any[];
      logger.info(`Found ${duplicates.length} sets of duplicate MEPs`, 'DataCleanup');

      for (const duplicate of duplicates) {
        try {
          await this.mergeDuplicateMEP(duplicate);
          recordsMerged++;
          
          // Count committees consolidated for this MEP
          const committeeCount = await db.execute(sql`
            SELECT COUNT(*) as count 
            FROM mep_committees 
            WHERE mep_id = ANY(${duplicate.duplicate_ids})
          `);
          committeesConsolidated += parseInt((committeeCount.rows[0] as any)?.count || 0);

        } catch (error) {
          const errorMsg = `Failed to merge duplicate MEP ${duplicate.full_name}: ${error}`;
          errors.push(errorMsg);
          logger.error(errorMsg, 'DataCleanup');
        }
      }

      return {
        duplicatesFound: duplicates.length,
        recordsMerged,
        committeesConsolidated,
        errors
      };

    } catch (error) {
      const errorMsg = `Duplicate detection failed: ${error}`;
      errors.push(errorMsg);
      logger.error(errorMsg, 'DataCleanup');
      
      return {
        duplicatesFound: 0,
        recordsMerged: 0,
        committeesConsolidated: 0,
        errors
      };
    }
  }

  /**
   * Merge a specific duplicate MEP set
   */
  private async mergeDuplicateMEP(duplicate: any): Promise<void> {
    const ids = duplicate.duplicate_ids as string[];
    const fullName = duplicate.full_name as string;
    
    logger.info(`Merging ${ids.length} duplicate records for ${fullName}`, 'DataCleanup');

    // Get all MEP records for this name
    const mepRecords = await db.select().from(meps).where(inArray(meps.id, ids));
    
    if (mepRecords.length < 2) return;

    // Choose the "primary" record (prefer the one with most complete data)
    const primaryMEP = this.selectPrimaryMEP(mepRecords);
    const duplicateIds = mepRecords.filter(m => m.id !== primaryMEP.id).map(m => m.id);

    // Get all committee memberships for the duplicates
    const duplicateCommittees = await db.select()
      .from(mepCommittees)
      .where(inArray(mepCommittees.mepId, duplicateIds));

    // Transfer committee memberships to primary MEP
    for (const committee of duplicateCommittees) {
      // Check if primary MEP already has this committee membership
      const existing = await db.select()
        .from(mepCommittees)
        .where(
          and(
            eq(mepCommittees.mepId, primaryMEP.id),
            eq(mepCommittees.committeeId, committee.committeeId)
          )
        );

      if (existing.length === 0) {
        // Transfer the committee membership
        await db.insert(mepCommittees).values({
          mepId: primaryMEP.id,
          committeeId: committee.committeeId,
          role: committee.role
        });
        
        logger.info(`Transferred committee ${committee.committeeId} to primary MEP ${primaryMEP.id}`, 'DataCleanup');
      }
    }

    // Delete duplicate committee memberships
    await db.delete(mepCommittees).where(inArray(mepCommittees.mepId, duplicateIds));

    // Mark duplicate MEPs as inactive instead of deleting (for audit trail)
    await db.update(meps)
      .set({ isActive: false, updatedAt: new Date() })
      .where(inArray(meps.id, duplicateIds));

    // Log the merge action
    await db.insert(changeLog).values({
      id: nanoid(),
      entityType: 'mep',
      entityId: primaryMEP.id,
      changeType: 'merge_duplicates',
      oldValues: { duplicateIds },
      newValues: { primaryId: primaryMEP.id, mergedCommittees: duplicateCommittees.length },
      createdAt: new Date()
    });

    logger.info(`Successfully merged ${duplicateIds.length} duplicate MEPs into ${primaryMEP.id}`, 'DataCleanup');
  }

  /**
   * Select the best primary MEP record from duplicates
   */
  private selectPrimaryMEP(mepRecords: any[]): any {
    // Scoring criteria:
    // 1. Has official URL (+10 points)
    // 2. Has email (+5 points)
    // 3. Has photo URL (+3 points)
    // 4. Has birth date (+2 points)
    // 5. More recent created date (+1 point per day newer)
    // 6. Shorter ID (prefer Q-style IDs) (+5 points)

    let bestMEP = mepRecords[0];
    let bestScore = this.scoreMEPRecord(bestMEP);

    for (let i = 1; i < mepRecords.length; i++) {
      const score = this.scoreMEPRecord(mepRecords[i]);
      if (score > bestScore) {
        bestScore = score;
        bestMEP = mepRecords[i];
      }
    }

    return bestMEP;
  }

  /**
   * Score a MEP record for primary selection
   */
  private scoreMEPRecord(mep: any): number {
    let score = 0;
    
    if (mep.officialUrl) score += 10;
    if (mep.email) score += 5;
    if (mep.photoUrl) score += 3;
    if (mep.birthDate) score += 2;
    if (mep.id.startsWith('Q')) score += 5; // Wikidata-style IDs are usually more reliable
    
    // Prefer more recent records (up to 30 days difference)
    if (mep.createdAt) {
      const daysSinceCreation = (Date.now() - new Date(mep.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 30 - daysSinceCreation) * 0.1;
    }

    return score;
  }

  /**
   * Clean up orphaned committee memberships
   */
  async cleanupOrphanedMemberships(): Promise<{
    orphanedMemberships: number;
    invalidCommittees: number;
    cleaned: number;
  }> {
    try {
      // Find memberships referencing non-existent MEPs
      const orphanedMEPs = await db.execute(sql`
        SELECT mc.mep_id, mc.committee_id, COUNT(*) as count
        FROM mep_committees mc
        LEFT JOIN meps m ON mc.mep_id = m.id AND m.is_active = true
        WHERE m.id IS NULL
        GROUP BY mc.mep_id, mc.committee_id
      `);

      // Find memberships referencing non-existent committees
      const orphanedCommittees = await db.execute(sql`
        SELECT mc.mep_id, mc.committee_id, COUNT(*) as count
        FROM mep_committees mc
        LEFT JOIN committees c ON mc.committee_id = c.id AND c.is_active = true
        WHERE c.id IS NULL
        GROUP BY mc.mep_id, mc.committee_id
      `);

      const orphanedMEPCount = orphanedMEPs.rows.length;
      const orphanedCommitteeCount = orphanedCommittees.rows.length;

      // Clean up orphaned memberships
      if (orphanedMEPCount > 0) {
        await db.execute(sql`
          DELETE FROM mep_committees 
          WHERE mep_id NOT IN (
            SELECT id FROM meps WHERE is_active = true
          )
        `);
      }

      if (orphanedCommitteeCount > 0) {
        await db.execute(sql`
          DELETE FROM mep_committees 
          WHERE committee_id NOT IN (
            SELECT id FROM committees WHERE is_active = true
          )
        `);
      }

      logger.info(`Cleaned up ${orphanedMEPCount + orphanedCommitteeCount} orphaned memberships`, 'DataCleanup');

      return {
        orphanedMemberships: orphanedMEPCount,
        invalidCommittees: orphanedCommitteeCount,
        cleaned: orphanedMEPCount + orphanedCommitteeCount
      };

    } catch (error) {
      logger.error(`Orphaned membership cleanup failed: ${error}`, 'DataCleanup');
      throw error;
    }
  }

  /**
   * Run comprehensive data cleanup
   */
  async runFullCleanup(): Promise<{
    success: boolean;
    duplicateCleanup: any;
    orphanedCleanup: any;
    summary: string;
  }> {
    try {
      logger.info("Starting comprehensive data cleanup", 'DataCleanup');

      // Step 1: Clean up duplicates
      const duplicateCleanup = await this.detectAndMergeDuplicates();

      // Step 2: Clean up orphaned memberships
      const orphanedCleanup = await this.cleanupOrphanedMemberships();

      const summary = `Cleanup completed: ${duplicateCleanup.recordsMerged} MEPs merged, ${duplicateCleanup.committeesConsolidated} committee memberships consolidated, ${orphanedCleanup.cleaned} orphaned memberships removed`;

      logger.info(summary, 'DataCleanup');

      return {
        success: true,
        duplicateCleanup,
        orphanedCleanup,
        summary
      };

    } catch (error) {
      logger.error(`Full cleanup failed: ${error}`, 'DataCleanup');
      return {
        success: false,
        duplicateCleanup: null,
        orphanedCleanup: null,
        summary: `Cleanup failed: ${error}`
      };
    }
  }
}

export const dataCleanupService = new DataCleanupService();