import { db } from "../db";
import { dataSyncService } from "./dataSync";
import { apiCache } from "../utils/cache";
import { OptimizedStorage } from "../storage/optimized";
import { performance } from "perf_hooks";

/**
 * Production monitoring service for performance, database, cache, and API health
 * Provides comprehensive monitoring capabilities for production operations
 */
export class MonitoringService {
  private metrics: Map<string, any> = new Map();
  private alerts: Array<{ type: string; message: string; timestamp: Date; severity: 'low' | 'medium' | 'high' | 'critical' }> = [];
  private performanceThresholds = {
    apiResponse: 2000, // 2 seconds
    dbQuery: 1000, // 1 second
    cacheHitRate: 0.7, // 70%
    euApiResponse: 5000 // 5 seconds
  };

  /**
   * Start performance monitoring for API endpoints
   */
  async startPerformanceMonitoring(): Promise<void> {
    console.log("🔍 Starting performance monitoring...");
    
    // Monitor API response times
    setInterval(async () => {
      await this.checkApiPerformance();
    }, 60000); // Every minute

    // Monitor database performance
    setInterval(async () => {
      await this.checkDatabasePerformance();
    }, 120000); // Every 2 minutes

    // Monitor cache effectiveness
    setInterval(async () => {
      await this.checkCacheEffectiveness();
    }, 300000); // Every 5 minutes

    // Monitor EU Parliament API health
    setInterval(async () => {
      await this.checkEUParliamentAPIHealth();
    }, 600000); // Every 10 minutes
  }

  /**
   * Check API endpoint response times
   */
  private async checkApiPerformance(): Promise<void> {
    const endpoints = [
      '/api/dashboard/stats',
      '/api/meps',
      '/api/committees',
      '/api/dashboard/recent-changes'
    ];

    const optimizedStorage = new OptimizedStorage();

    for (const endpoint of endpoints) {
      const startTime = performance.now();
      
      try {
        switch (endpoint) {
          case '/api/dashboard/stats':
            await optimizedStorage.getDashboardStats();
            break;
          case '/api/meps':
            await optimizedStorage.getMEPs({ limit: 50, offset: 0 });
            break;
          case '/api/committees':
            await optimizedStorage.getCommittees(50, 0);
            break;
          case '/api/dashboard/recent-changes':
            await optimizedStorage.getRecentChanges(10);
            break;
        }

        const responseTime = performance.now() - startTime;
        this.metrics.set(`api_${endpoint.replace(/\//g, '_')}_response_time`, responseTime);

        if (responseTime > this.performanceThresholds.apiResponse) {
          this.addAlert('performance', `API endpoint ${endpoint} slow response: ${responseTime.toFixed(2)}ms`, 'medium');
        }

      } catch (error) {
        this.addAlert('api', `API endpoint ${endpoint} error: ${error}`, 'high');
      }
    }
  }

  /**
   * Monitor database query performance and optimization
   */
  private async checkDatabasePerformance(): Promise<void> {
    try {
      const startTime = performance.now();
      
      // Test complex query performance
      const result = await db.execute(`
        SELECT 
          COUNT(*) as total_meps,
          COUNT(DISTINCT country) as countries,
          COUNT(DISTINCT political_group_abbr) as political_groups
        FROM meps
      `);

      const queryTime = performance.now() - startTime;
      this.metrics.set('db_complex_query_time', queryTime);

      if (queryTime > this.performanceThresholds.dbQuery) {
        this.addAlert('database', `Slow database query detected: ${queryTime.toFixed(2)}ms`, 'medium');
      }

      // Check database connections
      const connectionResult = await db.execute('SELECT 1 as health_check');
      this.metrics.set('db_health', connectionResult ? 'healthy' : 'unhealthy');

    } catch (error) {
      this.addAlert('database', `Database health check failed: ${error}`, 'critical');
      this.metrics.set('db_health', 'unhealthy');
    }
  }

  /**
   * Monitor cache effectiveness and hit rates
   */
  private async checkCacheEffectiveness(): Promise<void> {
    const cacheStats = (apiCache as any).getStats?.() || { hits: 0, misses: 0 };
    const hitRate = cacheStats.hits / (cacheStats.hits + cacheStats.misses) || 0;
    
    this.metrics.set('cache_hit_rate', hitRate);
    this.metrics.set('cache_hits', cacheStats.hits);
    this.metrics.set('cache_misses', cacheStats.misses);

    if (hitRate < this.performanceThresholds.cacheHitRate) {
      this.addAlert('cache', `Low cache hit rate: ${(hitRate * 100).toFixed(1)}%`, 'low');
    }
  }

  /**
   * Monitor EU Parliament API health and connectivity
   */
  private async checkEUParliamentAPIHealth(): Promise<void> {
    try {
      const startTime = performance.now();
      const isConnected = await dataSyncService.testConnection();
      const responseTime = performance.now() - startTime;

      this.metrics.set('eu_api_response_time', responseTime);
      this.metrics.set('eu_api_health', isConnected ? 'healthy' : 'unhealthy');

      if (!isConnected) {
        this.addAlert('external_api', 'EU Parliament API connection failed', 'high');
      } else if (responseTime > this.performanceThresholds.euApiResponse) {
        this.addAlert('external_api', `EU Parliament API slow response: ${responseTime.toFixed(2)}ms`, 'medium');
      }

    } catch (error) {
      this.addAlert('external_api', `EU Parliament API health check error: ${error}`, 'high');
      this.metrics.set('eu_api_health', 'unhealthy');
    }
  }

  /**
   * Add monitoring alert
   */
  private addAlert(type: string, message: string, severity: 'low' | 'medium' | 'high' | 'critical'): void {
    const alert = {
      type,
      message,
      timestamp: new Date(),
      severity
    };

    this.alerts.push(alert);
    console.log(`🚨 [${severity.toUpperCase()}] ${type}: ${message}`);

    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }
  }

  /**
   * Get current monitoring metrics
   */
  getMetrics(): Record<string, any> {
    return Object.fromEntries(this.metrics);
  }

  /**
   * Get recent alerts
   */
  getAlerts(limit: number = 50): Array<any> {
    return this.alerts.slice(-limit).reverse();
  }

  /**
   * Get system health summary
   */
  getHealthSummary(): {
    status: 'healthy' | 'warning' | 'critical';
    metrics: Record<string, any>;
    alerts: number;
    lastCheck: Date;
  } {
    const criticalAlerts = this.alerts.filter(a => a.severity === 'critical').length;
    const highAlerts = this.alerts.filter(a => a.severity === 'high').length;
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalAlerts > 0) status = 'critical';
    else if (highAlerts > 0) status = 'warning';

    return {
      status,
      metrics: this.getMetrics(),
      alerts: this.alerts.length,
      lastCheck: new Date()
    };
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): {
    apiPerformance: Record<string, number>;
    databaseHealth: string;
    cacheEffectiveness: number;
    euApiHealth: string;
    recommendations: string[];
  } {
    const metrics = this.getMetrics();
    const recommendations: string[] = [];

    // API performance analysis
    const apiPerformance: Record<string, number> = {};
    for (const entry of Array.from(this.metrics.entries())) {
      const [key, value] = entry;
      if (key.includes('api_') && key.includes('response_time')) {
        apiPerformance[key] = value;
        if (value > this.performanceThresholds.apiResponse) {
          recommendations.push(`Optimize ${key.replace('api_', '').replace('_response_time', '')} endpoint performance`);
        }
      }
    }

    // Cache analysis
    const cacheHitRate = metrics.cache_hit_rate || 0;
    if (cacheHitRate < this.performanceThresholds.cacheHitRate) {
      recommendations.push('Improve cache strategy to increase hit rate');
    }

    // Database analysis
    if (metrics.db_complex_query_time > this.performanceThresholds.dbQuery) {
      recommendations.push('Review and optimize slow database queries');
    }

    return {
      apiPerformance,
      databaseHealth: metrics.db_health || 'unknown',
      cacheEffectiveness: cacheHitRate,
      euApiHealth: metrics.eu_api_health || 'unknown',
      recommendations
    };
  }
}

export const monitoringService = new MonitoringService();