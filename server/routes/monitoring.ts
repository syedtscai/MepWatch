import { Router } from "express";
import { monitoringService } from "../services/monitoring";
import { dataQualityService } from "../services/dataQuality";
import { securityService } from "../services/security";
import { isAuthenticated } from "../replitAuth";
import { isAdmin } from "../middleware/adminAuth";

const router = Router();

/**
 * Monitoring and administrative endpoints
 * Protected routes for system monitoring, data quality, and security
 */

// System health check
router.get("/health", async (req, res) => {
  try {
    const healthSummary = monitoringService.getHealthSummary();
    res.json(healthSummary);
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(500).json({ error: "Health check failed" });
  }
});

// Performance metrics - admin only
router.get("/metrics/performance", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const metrics = monitoringService.getMetrics();
    const report = monitoringService.generatePerformanceReport();
    
    res.json({
      current_metrics: metrics,
      performance_report: report,
      timestamp: new Date()
    });
  } catch (error) {
    console.error("Error fetching performance metrics:", error);
    res.status(500).json({ error: "Failed to fetch performance metrics" });
  }
});

// Data quality report - admin only
router.get("/metrics/data-quality", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const qualityReport = await dataQualityService.generateQualityReport();
    res.json(qualityReport);
  } catch (error) {
    console.error("Error generating data quality report:", error);
    res.status(500).json({ error: "Failed to generate data quality report" });
  }
});

// Security report - admin only
router.get("/metrics/security", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const securityReport = await securityService.generateSecurityReport();
    res.json(securityReport);
  } catch (error) {
    console.error("Error generating security report:", error);
    res.status(500).json({ error: "Failed to generate security report" });
  }
});

// Monitoring alerts - admin only
router.get("/alerts", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const monitoringAlerts = monitoringService.getAlerts(limit);
    const securityAlerts = securityService.getSecurityAlerts(limit);
    
    const allAlerts = [
      ...monitoringAlerts.map(alert => ({ ...alert, category: 'monitoring' })),
      ...securityAlerts.map(alert => ({ ...alert, category: 'security' }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({
      alerts: allAlerts.slice(0, limit),
      total: allAlerts.length,
      timestamp: new Date()
    });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

// Comprehensive system status - admin only
router.get("/status/comprehensive", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const [
      healthSummary,
      performanceReport,
      qualityReport,
      securityReport
    ] = await Promise.all([
      monitoringService.getHealthSummary(),
      monitoringService.generatePerformanceReport(),
      dataQualityService.generateQualityReport(),
      securityService.generateSecurityReport()
    ]);

    // Calculate overall system score
    const scores = [
      healthSummary.status === 'healthy' ? 100 : healthSummary.status === 'warning' ? 70 : 30,
      Math.min(100, (performanceReport.cacheEffectiveness * 100)),
      qualityReport.overall_score,
      securityReport.overall_security_score
    ];

    const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    res.json({
      overall_score: Math.round(overallScore),
      status: overallScore >= 90 ? 'excellent' : overallScore >= 70 ? 'good' : overallScore >= 50 ? 'fair' : 'poor',
      health: healthSummary,
      performance: performanceReport,
      data_quality: qualityReport,
      security: securityReport,
      timestamp: new Date()
    });
  } catch (error) {
    console.error("Error generating comprehensive status:", error);
    res.status(500).json({ error: "Failed to generate comprehensive status" });
  }
});

// Manual data quality validation - admin only
router.post("/validate/data-quality", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const validation = await dataQualityService.validateDailySyncData();
    res.json(validation);
  } catch (error) {
    console.error("Error validating data quality:", error);
    res.status(500).json({ error: "Failed to validate data quality" });
  }
});

// Manual security audit - admin only
router.post("/audit/security", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const audit = await securityService.performSecurityAudit();
    res.json(audit);
  } catch (error) {
    console.error("Error performing security audit:", error);
    res.status(500).json({ error: "Failed to perform security audit" });
  }
});

// Admin user management endpoints
router.get("/admin/users", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { storage } = await import("../storage");
    const users = await storage.getAllUsers();
    res.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.post("/admin/users/:userId/role", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role. Must be 'user' or 'admin'" });
    }
    
    const { storage } = await import("../storage");
    const updatedUser = await storage.updateUserRole(userId, role);
    
    res.json({ 
      message: `User role updated to ${role}`,
      user: updatedUser 
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ error: "Failed to update user role" });
  }
});

export { router as monitoringRouter };