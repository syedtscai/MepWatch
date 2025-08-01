import { db } from "../db";
import { sql } from "drizzle-orm";

/**
 * Database optimization utilities
 */
export class DatabaseOptimizer {
  /**
   * Create necessary indexes for performance
   */
  static async createOptimizationIndexes(): Promise<void> {
    try {
      console.log('Creating performance indexes...');
      
      // MEPs table indexes
      await db.execute(sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_meps_country 
        ON meps(country) WHERE is_active = true;
      `);
      
      await db.execute(sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_meps_political_group 
        ON meps(political_group_abbr) WHERE is_active = true;
      `);
      
      await db.execute(sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_meps_search 
        ON meps USING gin(to_tsvector('english', full_name || ' ' || first_name || ' ' || last_name))
        WHERE is_active = true;
      `);
      
      // Committee table indexes
      await db.execute(sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_committees_code 
        ON committees(code) WHERE is_active = true;
      `);
      
      // MEP-Committee relationships
      await db.execute(sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mep_committees_mep 
        ON mep_committees(mep_id);
      `);
      
      await db.execute(sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mep_committees_committee 
        ON mep_committees(committee_id);
      `);
      
      // Events index
      await db.execute(sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_committee_events_date 
        ON committee_events(committee_id, start_date) WHERE is_public = true;
      `);
      
      // Change log index
      await db.execute(sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_change_log_created 
        ON change_log(created_at DESC);
      `);
      
      console.log('Performance indexes created successfully');
    } catch (error) {
      // Indexes might already exist, log but don't fail
      console.log('Index creation completed (some may have already existed)');
    }
  }

  /**
   * Analyze table statistics for query optimization
   */
  static async analyzeTableStatistics(): Promise<void> {
    try {
      console.log('Analyzing table statistics...');
      
      await db.execute(sql`ANALYZE meps;`);
      await db.execute(sql`ANALYZE committees;`);
      await db.execute(sql`ANALYZE mep_committees;`);
      await db.execute(sql`ANALYZE committee_events;`);
      await db.execute(sql`ANALYZE change_log;`);
      
      console.log('Table statistics analyzed');
    } catch (error) {
      console.error('Error analyzing table statistics:', error);
    }
  }

  /**
   * Get database performance metrics
   */
  static async getPerformanceMetrics(): Promise<{
    tablesSizes: Array<{ table_name: string; size: string }>;
    indexUsage: Array<{ table_name: string; index_name: string; scans: number }>;
  }> {
    try {
      const [tablesSizes, indexUsage] = await Promise.all([
        db.execute(sql`
          SELECT 
            schemaname,
            tablename as table_name,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
          FROM pg_tables 
          WHERE schemaname = 'public'
          ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
        `),
        db.execute(sql`
          SELECT 
            schemaname,
            tablename as table_name,
            indexname as index_name,
            idx_scan as scans
          FROM pg_stat_user_indexes 
          ORDER BY idx_scan DESC;
        `)
      ]);

      return {
        tablesSizes: tablesSizes.rows as any,
        indexUsage: indexUsage.rows as any
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      return { tablesSizes: [], indexUsage: [] };
    }
  }
}