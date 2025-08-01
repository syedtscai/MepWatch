import { db } from "../db";
import { OptimizedStorage } from "../storage/optimized";
import { dataSyncService } from "./dataSync";

/**
 * Data quality assurance service for validating EU Parliament data integrity
 * Ensures completeness, accuracy, and consistency of synchronized data
 */
export class DataQualityService {
  private qualityMetrics: Map<string, any> = new Map();
  private validationRules = {
    minMEPs: 700, // Minimum expected MEPs
    maxMEPs: 750, // Maximum expected MEPs
    expectedCommittees: 15, // Minimum expected committees
    requiredMEPFields: ['firstName', 'lastName', 'country', 'politicalGroupAbbr'],
    requiredCommitteeFields: ['name', 'code']
  };

  /**
   * Start automated data quality monitoring
   */
  async startQualityMonitoring(): Promise<void> {
    console.log("📊 Starting data quality monitoring...");

    // Daily sync validation (runs after each sync)
    setInterval(async () => {
      await this.validateDailySyncData();
    }, 3600000); // Every hour

    // Data completeness check
    setInterval(async () => {
      await this.checkDataCompleteness();
    }, 21600000); // Every 6 hours

    // Official source verification
    setInterval(async () => {
      await this.verifyOfficialSources();
    }, 43200000); // Every 12 hours
  }

  /**
   * Validate data after daily synchronization
   */
  async validateDailySyncData(): Promise<{
    isValid: boolean;
    issues: string[];
    metrics: Record<string, any>;
  }> {
    console.log("🔍 Validating daily sync data...");
    const issues: string[] = [];
    const optimizedStorage = new OptimizedStorage();

    try {
      // Check MEP count
      const mepResult = await optimizedStorage.getMEPs({ limit: 1000, offset: 0 });
      const mepCount = mepResult.total;
      
      this.qualityMetrics.set('total_meps', mepCount);
      
      if (mepCount < this.validationRules.minMEPs) {
        issues.push(`Low MEP count: ${mepCount} (expected min: ${this.validationRules.minMEPs})`);
      }
      if (mepCount > this.validationRules.maxMEPs) {
        issues.push(`High MEP count: ${mepCount} (expected max: ${this.validationRules.maxMEPs})`);
      }

      // Check committee count
      const committeeResult = await optimizedStorage.getCommittees(100, 0);
      const committeeCount = committeeResult.total;
      
      this.qualityMetrics.set('total_committees', committeeCount);
      
      if (committeeCount < this.validationRules.expectedCommittees) {
        issues.push(`Low committee count: ${committeeCount} (expected min: ${this.validationRules.expectedCommittees})`);
      }

      // Check for recent updates
      const latestUpdate = await optimizedStorage.getLatestDataUpdate();
      if (latestUpdate) {
        const lastUpdateTime = new Date(latestUpdate.completedAt || latestUpdate.startedAt || new Date());
        const hoursSinceUpdate = (Date.now() - lastUpdateTime.getTime()) / (1000 * 60 * 60);
        
        this.qualityMetrics.set('hours_since_last_update', hoursSinceUpdate);
        
        if (hoursSinceUpdate > 30) { // More than 30 hours
          issues.push(`Data may be stale: ${hoursSinceUpdate.toFixed(1)} hours since last update`);
        }
      }

      const isValid = issues.length === 0;
      this.qualityMetrics.set('sync_validation_status', isValid ? 'valid' : 'issues_found');
      this.qualityMetrics.set('sync_validation_timestamp', new Date());

      if (issues.length > 0) {
        console.log("⚠️ Data quality issues found:", issues);
      } else {
        console.log("✅ Daily sync data validation passed");
      }

      return {
        isValid,
        issues,
        metrics: Object.fromEntries(this.qualityMetrics)
      };

    } catch (error) {
      issues.push(`Validation error: ${error}`);
      console.error("❌ Data validation failed:", error);
      
      return {
        isValid: false,
        issues,
        metrics: Object.fromEntries(this.qualityMetrics)
      };
    }
  }

  /**
   * Check data completeness and field population
   */
  async checkDataCompleteness(): Promise<{
    completeness: Record<string, number>;
    missingData: string[];
  }> {
    console.log("📋 Checking data completeness...");
    const missingData: string[] = [];
    const completeness: Record<string, number> = {};

    try {
      // Check MEP data completeness
      const mepCompletenessQuery = await db.execute(`
        SELECT 
          COUNT(*) as total_meps,
          COUNT(first_name) as has_first_name,
          COUNT(last_name) as has_last_name,
          COUNT(country) as has_country,
          COUNT(political_group_abbr) as has_political_group,
          COUNT(email) as has_email,
          COUNT(profile_image_url) as has_profile_image
        FROM meps
      `);

      const mepStats = mepCompletenessQuery.rows[0] as any;
      const totalMEPs = parseInt(mepStats.total_meps);

      // Calculate completeness percentages
      this.validationRules.requiredMEPFields.forEach(field => {
        const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
        const fieldCount = parseInt(mepStats[`has_${dbField}`] || 0);
        const completenessPercent = (fieldCount / totalMEPs) * 100;
        
        completeness[`mep_${field}`] = completenessPercent;
        
        if (completenessPercent < 95) { // Less than 95% complete
          missingData.push(`MEP ${field}: ${completenessPercent.toFixed(1)}% complete`);
        }
      });

      // Check committee data completeness
      const committeeCompletenessQuery = await db.execute(`
        SELECT 
          COUNT(*) as total_committees,
          COUNT(name) as has_name,
          COUNT(code) as has_code,
          COUNT(description) as has_description
        FROM committees
      `);

      const committeeStats = committeeCompletenessQuery.rows[0] as any;
      const totalCommittees = parseInt(committeeStats.total_committees);

      this.validationRules.requiredCommitteeFields.forEach(field => {
        const fieldCount = parseInt(committeeStats[`has_${field}`] || 0);
        const completenessPercent = (fieldCount / totalCommittees) * 100;
        
        completeness[`committee_${field}`] = completenessPercent;
        
        if (completenessPercent < 100) { // Committees should be 100% complete
          missingData.push(`Committee ${field}: ${completenessPercent.toFixed(1)}% complete`);
        }
      });

      this.qualityMetrics.set('data_completeness', completeness);
      this.qualityMetrics.set('completeness_check_timestamp', new Date());

      console.log("📊 Data completeness check completed");

      return { completeness, missingData };

    } catch (error) {
      console.error("❌ Data completeness check failed:", error);
      missingData.push(`Completeness check error: ${error}`);
      return { completeness, missingData };
    }
  }

  /**
   * Verify data against official EU Parliament sources
   */
  async verifyOfficialSources(): Promise<{
    sourceVerification: Record<string, boolean>;
    discrepancies: string[];
  }> {
    console.log("🔍 Verifying official sources...");
    const discrepancies: string[] = [];
    const sourceVerification: Record<string, boolean> = {};

    try {
      // Test EU Parliament API connectivity
      const apiHealthy = await dataSyncService.testConnection();
      sourceVerification['eu_parliament_api'] = apiHealthy;

      if (!apiHealthy) {
        discrepancies.push('EU Parliament API is not accessible');
      }

      // Verify MEP data structure matches expected format
      const optimizedStorage = new OptimizedStorage();
      const sampleMEPs = await optimizedStorage.getMEPs({ limit: 10, offset: 0 });
      
      if (sampleMEPs.meps.length > 0) {
        const sampleMEP = sampleMEPs.meps[0];
        const hasRequiredFields = this.validationRules.requiredMEPFields.every(field => 
          sampleMEP.hasOwnProperty(field) && sampleMEP[field as keyof typeof sampleMEP] !== null
        );
        
        sourceVerification['mep_data_structure'] = hasRequiredFields;
        
        if (!hasRequiredFields) {
          discrepancies.push('MEP data structure does not match expected format');
        }
      }

      // Check for data freshness (within 48 hours)
      const latestUpdate = await optimizedStorage.getLatestDataUpdate();
      if (latestUpdate) {
        const updateAge = Date.now() - new Date(latestUpdate.completedAt || latestUpdate.startedAt || new Date()).getTime();
        const hoursOld = updateAge / (1000 * 60 * 60);
        const isFresh = hoursOld < 48;
        
        sourceVerification['data_freshness'] = isFresh;
        
        if (!isFresh) {
          discrepancies.push(`Data is ${hoursOld.toFixed(1)} hours old (recommended: < 48 hours)`);
        }
      }

      this.qualityMetrics.set('source_verification', sourceVerification);
      this.qualityMetrics.set('source_verification_timestamp', new Date());

      console.log("✅ Source verification completed");

      return { sourceVerification, discrepancies };

    } catch (error) {
      console.error("❌ Source verification failed:", error);
      discrepancies.push(`Source verification error: ${error}`);
      
      return {
        sourceVerification: { error: false },
        discrepancies
      };
    }
  }

  /**
   * Generate comprehensive data quality report
   */
  async generateQualityReport(): Promise<{
    overall_score: number;
    sync_validation: any;
    completeness: any;
    source_verification: any;
    recommendations: string[];
    timestamp: Date;
  }> {
    console.log("📋 Generating data quality report...");

    const syncValidation = await this.validateDailySyncData();
    const completeness = await this.checkDataCompleteness();
    const sourceVerification = await this.verifyOfficialSources();

    // Calculate overall quality score (0-100)
    let score = 100;
    
    // Deduct points for sync issues
    score -= syncValidation.issues.length * 10;
    
    // Deduct points for completeness issues
    score -= completeness.missingData.length * 5;
    
    // Deduct points for source issues
    score -= sourceVerification.discrepancies.length * 15;

    score = Math.max(0, score); // Don't go below 0

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (syncValidation.issues.length > 0) {
      recommendations.push('Address data synchronization issues');
    }
    
    if (completeness.missingData.length > 0) {
      recommendations.push('Improve data completeness for missing fields');
    }
    
    if (sourceVerification.discrepancies.length > 0) {
      recommendations.push('Resolve official source verification issues');
    }

    if (score === 100) {
      recommendations.push('Data quality is excellent - maintain current standards');
    }

    return {
      overall_score: score,
      sync_validation: syncValidation,
      completeness: completeness,
      source_verification: sourceVerification,
      recommendations,
      timestamp: new Date()
    };
  }

  /**
   * Get current quality metrics
   */
  getQualityMetrics(): Record<string, any> {
    return Object.fromEntries(this.qualityMetrics);
  }
}

export const dataQualityService = new DataQualityService();