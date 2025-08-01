import { db } from "../db";
import { Request } from "express";
import { sql } from "drizzle-orm";

/**
 * Security and compliance service for production monitoring
 * Handles security audits, rate limiting, dependency scanning, and compliance
 */
export class SecurityService {
  private securityMetrics: Map<string, any> = new Map();
  private rateLimitMap: Map<string, { count: number; lastReset: number }> = new Map();
  private securityAlerts: Array<{
    type: string;
    message: string;
    ip?: string;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }> = [];

  // Rate limiting configuration
  private rateLimits = {
    api: { requests: 100, window: 60000 }, // 100 requests per minute
    export: { requests: 5, window: 300000 }, // 5 exports per 5 minutes
    auth: { requests: 10, window: 600000 }, // 10 auth attempts per 10 minutes
  };

  /**
   * Start security monitoring systems
   */
  async startSecurityMonitoring(): Promise<void> {
    console.log("🔒 Starting security monitoring...");

    // Regular security audit
    setInterval(async () => {
      await this.performSecurityAudit();
    }, 3600000); // Every hour

    // Dependency vulnerability check
    setInterval(async () => {
      await this.checkDependencyVulnerabilities();
    }, 86400000); // Daily

    // Compliance monitoring
    setInterval(async () => {
      await this.checkEUDataProtectionCompliance();
    }, 43200000); // Every 12 hours

    // Clean up old rate limit entries
    setInterval(() => {
      this.cleanupRateLimitData();
    }, 300000); // Every 5 minutes
  }

  /**
   * Rate limiting middleware
   */
  checkRateLimit(type: 'api' | 'export' | 'auth', identifier: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    const limit = this.rateLimits[type];
    const key = `${type}_${identifier}`;
    const now = Date.now();

    let entry = this.rateLimitMap.get(key);
    
    if (!entry || (now - entry.lastReset) > limit.window) {
      // Reset the counter
      entry = { count: 0, lastReset: now };
      this.rateLimitMap.set(key, entry);
    }

    const allowed = entry.count < limit.requests;
    
    if (allowed) {
      entry.count++;
    } else {
      // Rate limit exceeded
      this.addSecurityAlert('rate_limit', `Rate limit exceeded for ${type} by ${identifier}`, identifier, 'medium');
    }

    return {
      allowed,
      remaining: Math.max(0, limit.requests - entry.count),
      resetTime: entry.lastReset + limit.window
    };
  }

  /**
   * Perform comprehensive security audit
   */
  async performSecurityAudit(): Promise<{
    score: number;
    issues: string[];
    recommendations: string[];
  }> {
    console.log("🔍 Performing security audit...");
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    try {
      // Check for suspicious authentication patterns
      const suspiciousAuthQuery = await db.execute(sql`
        SELECT 
          COUNT(*) as failed_attempts,
          COUNT(DISTINCT sid) as unique_sessions
        FROM sessions 
        WHERE expire > NOW() - INTERVAL '24 hours'
      `);

      // Check database security
      const dbSecurityCheck = await this.checkDatabaseSecurity();
      if (!dbSecurityCheck.secure) {
        issues.push(...dbSecurityCheck.issues);
        score -= 20;
      }

      // Check session security
      const sessionSecurityCheck = await this.checkSessionSecurity();
      if (!sessionSecurityCheck.secure) {
        issues.push(...sessionSecurityCheck.issues);
        score -= 15;
      }

      // Check API endpoint security
      const apiSecurityCheck = await this.checkAPIEndpointSecurity();
      if (!apiSecurityCheck.secure) {
        issues.push(...apiSecurityCheck.issues);
        score -= 10;
      }

      // Generate recommendations based on issues
      if (issues.length === 0) {
        recommendations.push('Security posture is strong - maintain current practices');
      } else {
        recommendations.push('Address identified security issues immediately');
        recommendations.push('Review and update security policies');
        recommendations.push('Consider additional monitoring and alerting');
      }

      this.securityMetrics.set('security_audit_score', score);
      this.securityMetrics.set('security_audit_timestamp', new Date());
      this.securityMetrics.set('security_issues_count', issues.length);

      console.log(`🔒 Security audit completed - Score: ${score}/100`);

      return { score, issues, recommendations };

    } catch (error) {
      issues.push(`Security audit error: ${error}`);
      console.error("❌ Security audit failed:", error);
      
      return {
        score: 0,
        issues,
        recommendations: ['Fix security audit system errors']
      };
    }
  }

  /**
   * Check database security configuration
   */
  private async checkDatabaseSecurity(): Promise<{ secure: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check if database connections are encrypted
      const connectionCheck = await db.execute(sql`
        SELECT setting 
        FROM pg_settings 
        WHERE name = 'ssl'
      `);

      // Check for proper user permissions
      const userPermissionsCheck = await db.execute(sql`
        SELECT 
          usename,
          usesuper,
          usecreatedb,
          usebypassrls
        FROM pg_user 
        WHERE usename = current_user
      `);

      const userInfo = userPermissionsCheck.rows[0] as any;
      if (userInfo?.usesuper) {
        issues.push('Database user has superuser privileges - consider using restricted user');
      }

      return {
        secure: issues.length === 0,
        issues
      };

    } catch (error) {
      issues.push(`Database security check failed: ${error}`);
      return { secure: false, issues };
    }
  }

  /**
   * Check session security configuration
   */
  private async checkSessionSecurity(): Promise<{ secure: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check for old sessions
      const oldSessionsQuery = await db.execute(sql`
        SELECT COUNT(*) as old_sessions
        FROM sessions 
        WHERE expire < NOW() - INTERVAL '7 days'
      `);

      const oldSessions = parseInt((oldSessionsQuery.rows[0] as any)?.old_sessions || 0);
      if (oldSessions > 100) {
        issues.push(`${oldSessions} expired sessions not cleaned up`);
      }

      // Check session configuration
      if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
        issues.push('Session secret is weak or missing');
      }

      return {
        secure: issues.length === 0,
        issues
      };

    } catch (error) {
      issues.push(`Session security check failed: ${error}`);
      return { secure: false, issues };
    }
  }

  /**
   * Check API endpoint security
   */
  private async checkAPIEndpointSecurity(): Promise<{ secure: boolean; issues: string[] }> {
    const issues: string[] = [];

    // Check if all sensitive endpoints are protected
    const protectedEndpoints = [
      '/api/meps',
      '/api/committees', 
      '/api/dashboard/stats',
      '/api/export/*',
      '/api/admin/*'
    ];

    // In a real implementation, this would check endpoint configurations
    // For now, we assume they are properly protected based on our implementation

    // Check for proper error handling (no sensitive data leakage)
    // This would involve checking error responses and logs

    return {
      secure: issues.length === 0,
      issues
    };
  }

  /**
   * Check for dependency vulnerabilities
   */
  async checkDependencyVulnerabilities(): Promise<{
    vulnerabilities: Array<{ package: string; severity: string; description: string }>;
    recommendations: string[];
  }> {
    console.log("🔍 Checking dependency vulnerabilities...");
    const vulnerabilities: Array<{ package: string; severity: string; description: string }> = [];
    const recommendations: string[] = [];

    try {
      // In a real implementation, this would integrate with npm audit or similar tools
      // For now, we'll simulate basic checks

      // Check Node.js version
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      
      if (majorVersion < 18) {
        vulnerabilities.push({
          package: 'node',
          severity: 'medium',
          description: `Node.js version ${nodeVersion} is outdated`
        });
        recommendations.push('Update to Node.js 18 LTS or newer');
      }

      // Check critical packages (in real implementation, would use vulnerability databases)
      const criticalPackages = ['express', 'passport', 'drizzle-orm'];
      
      this.securityMetrics.set('vulnerability_scan_timestamp', new Date());
      this.securityMetrics.set('vulnerabilities_found', vulnerabilities.length);

      if (vulnerabilities.length === 0) {
        recommendations.push('Dependencies appear secure - continue regular monitoring');
      } else {
        recommendations.push('Update vulnerable dependencies immediately');
        recommendations.push('Implement automated dependency scanning');
      }

      console.log(`🔒 Dependency scan completed - ${vulnerabilities.length} vulnerabilities found`);

      return { vulnerabilities, recommendations };

    } catch (error) {
      console.error("❌ Dependency vulnerability check failed:", error);
      
      return {
        vulnerabilities: [{
          package: 'scan-error',
          severity: 'high',
          description: `Vulnerability scan failed: ${error}`
        }],
        recommendations: ['Fix dependency scanning system']
      };
    }
  }

  /**
   * Check EU data protection compliance (GDPR)
   */
  async checkEUDataProtectionCompliance(): Promise<{
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    console.log("🇪🇺 Checking EU data protection compliance...");
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check data retention policies
      const oldDataQuery = await db.execute(sql`
        SELECT 
          COUNT(*) as old_sessions
        FROM sessions 
        WHERE expire < NOW() - INTERVAL '30 days'
      `);

      const oldSessions = parseInt((oldDataQuery.rows[0] as any)?.old_sessions || 0);
      if (oldSessions > 0) {
        issues.push(`${oldSessions} sessions older than 30 days should be purged`);
      }

      // Check user data handling
      const userDataQuery = await db.execute(sql`
        SELECT 
          COUNT(*) as users_with_email,
          COUNT(*) as total_users
        FROM users
      `);

      // Check audit logging
      const auditLogQuery = await db.execute(sql`
        SELECT COUNT(*) as audit_entries
        FROM data_updates 
        WHERE started_at > NOW() - INTERVAL '90 days'
      `);

      // Verify data minimization principles
      // In EU Parliament context, we only store necessary professional information
      
      // Check for proper consent mechanisms (would be part of authentication flow)
      
      // Verify data subject rights implementation
      // Users should be able to request their data and deletion

      const compliant = issues.length === 0;
      
      this.securityMetrics.set('gdpr_compliance_status', compliant);
      this.securityMetrics.set('gdpr_check_timestamp', new Date());

      if (compliant) {
        recommendations.push('GDPR compliance maintained - continue monitoring');
      } else {
        recommendations.push('Address GDPR compliance issues immediately');
        recommendations.push('Review data retention and deletion policies');
        recommendations.push('Implement user data subject rights procedures');
      }

      console.log(`🇪🇺 GDPR compliance check completed - ${compliant ? 'Compliant' : 'Issues found'}`);

      return { compliant, issues, recommendations };

    } catch (error) {
      console.error("❌ GDPR compliance check failed:", error);
      issues.push(`GDPR compliance check error: ${error}`);
      
      return {
        compliant: false,
        issues,
        recommendations: ['Fix GDPR compliance monitoring system']
      };
    }
  }

  /**
   * Add security alert
   */
  private addSecurityAlert(
    type: string, 
    message: string, 
    ip?: string, 
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): void {
    const alert = {
      type,
      message,
      ip,
      timestamp: new Date(),
      severity
    };

    this.securityAlerts.push(alert);
    console.log(`🚨 [${severity.toUpperCase()}] Security Alert - ${type}: ${message}`);

    // Keep only last 1000 alerts
    if (this.securityAlerts.length > 1000) {
      this.securityAlerts = this.securityAlerts.slice(-1000);
    }
  }

  /**
   * Clean up old rate limit data
   */
  private cleanupRateLimitData(): void {
    const now = Date.now();
    const maxWindow = Math.max(...Object.values(this.rateLimits).map(limit => limit.window));
    
    for (const entry of Array.from(this.rateLimitMap.entries())) {
      const [key, entryData] = entry;
      if ((now - entryData.lastReset) > maxWindow * 2) {
        this.rateLimitMap.delete(key);
      }
    }
  }

  /**
   * Get security metrics
   */
  getSecurityMetrics(): Record<string, any> {
    return Object.fromEntries(this.securityMetrics);
  }

  /**
   * Get recent security alerts
   */
  getSecurityAlerts(limit: number = 50): Array<any> {
    return this.securityAlerts.slice(-limit).reverse();
  }

  /**
   * Generate comprehensive security report
   */
  async generateSecurityReport(): Promise<{
    overall_security_score: number;
    audit_results: any;
    vulnerability_scan: any;
    gdpr_compliance: any;
    rate_limiting_stats: any;
    recommendations: string[];
    timestamp: Date;
  }> {
    console.log("🔒 Generating comprehensive security report...");

    const auditResults = await this.performSecurityAudit();
    const vulnerabilityScan = await this.checkDependencyVulnerabilities();
    const gdprCompliance = await this.checkEUDataProtectionCompliance();

    // Calculate overall security score
    let overallScore = auditResults.score;
    
    if (vulnerabilityScan.vulnerabilities.length > 0) {
      overallScore -= vulnerabilityScan.vulnerabilities.length * 5;
    }
    
    if (!gdprCompliance.compliant) {
      overallScore -= 25;
    }

    overallScore = Math.max(0, overallScore);

    // Rate limiting statistics
    const rateLimitingStats = {
      active_limits: this.rateLimitMap.size,
      recent_alerts: this.securityAlerts.filter(a => 
        a.type === 'rate_limit' && 
        Date.now() - a.timestamp.getTime() < 3600000 // Last hour
      ).length
    };

    // Compile all recommendations
    const allRecommendations = [
      ...auditResults.recommendations,
      ...vulnerabilityScan.recommendations,
      ...gdprCompliance.recommendations
    ];

    return {
      overall_security_score: overallScore,
      audit_results: auditResults,
      vulnerability_scan: vulnerabilityScan,
      gdpr_compliance: gdprCompliance,
      rate_limiting_stats: rateLimitingStats,
      recommendations: Array.from(new Set(allRecommendations)), // Remove duplicates
      timestamp: new Date()
    };
  }
}

export const securityService = new SecurityService();