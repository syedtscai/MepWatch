import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { OptimizedStorage } from "./storage/optimized";
import { dataSyncService } from "./services/dataSync";
import { exportService } from "./services/exportService";
import { schedulerService } from "./services/scheduler";
import { monitoringService } from "./services/monitoring";
import { dataQualityService } from "./services/dataQuality";
import { securityService } from "./services/security";
import { dataCleanupService } from "./services/dataCleanup";
import { apiCache } from "./utils/cache";
import { logger } from "./utils/logger";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { apiRateLimit, exportRateLimit, authRateLimit } from "./middleware/rateLimiting";
import { monitoringRouter } from "./routes/monitoring";
import { z } from "zod";

// Use optimized storage by default
const optimizedStorage = new OptimizedStorage();

const searchFiltersSchema = z.object({
  search: z.string().optional(),
  country: z.string().optional(),
  politicalGroup: z.string().optional(),
  committee: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50)
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize monitoring services
  // Note: Using console.log for startup messages is acceptable as logger may not be ready
  await monitoringService.startPerformanceMonitoring();
  await dataQualityService.startQualityMonitoring();
  await securityService.startSecurityMonitoring();
  
  // Auth middleware
  await setupAuth(app);

  // Monitoring and admin routes
  app.use("/api/monitoring", monitoringRouter);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      logger.error("Error fetching user", 'Auth', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Dashboard stats with caching and rate limiting
  app.get("/api/dashboard/stats", apiRateLimit, isAuthenticated, async (req, res) => {
    try {
      const stats = await optimizedStorage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      logger.error("Error fetching dashboard stats", 'API', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ error: "Failed to fetch dashboard statistics" });
    }
  });
  
  // Recent changes with caching and rate limiting
  app.get("/api/dashboard/recent-changes", apiRateLimit, isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const changes = await optimizedStorage.getRecentChanges(limit);
      res.json(changes);
    } catch (error) {
      logger.error("Error fetching recent changes", 'API', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ error: "Failed to fetch recent changes" });
    }
  });
  
  // MEPs endpoints with rate limiting
  app.get("/api/meps", apiRateLimit, isAuthenticated, async (req, res) => {
    try {
      const filters = searchFiltersSchema.parse(req.query);
      const { page, limit, ...searchFilters } = filters;
      const offset = (page - 1) * limit;
      
      const result = await optimizedStorage.getMEPs({
        ...searchFilters,
        limit,
        offset
      });
      
      res.json({
        data: result.meps,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit)
        }
      });
    } catch (error) {
      logger.error("Error fetching MEPs", 'API', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ error: "Failed to fetch MEPs" });
    }
  });
  
  app.get("/api/meps/:id", apiRateLimit, isAuthenticated, async (req, res) => {
    try {
      const mep = await optimizedStorage.getMEP(req.params.id);
      if (!mep) {
        return res.status(404).json({ error: "MEP not found" });
      }
      res.json(mep);
    } catch (error) {
      console.error("Error fetching MEP:", error);
      res.status(500).json({ error: "Failed to fetch MEP" });
    }
  });
  
  // Committees endpoints with rate limiting
  app.get("/api/committees", apiRateLimit, isAuthenticated, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;
      
      const result = await optimizedStorage.getCommittees(limit, offset);
      
      res.json({
        data: result.committees,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching committees:", error);
      res.status(500).json({ error: "Failed to fetch committees" });
    }
  });
  
  app.get("/api/committees/:id", apiRateLimit, isAuthenticated, async (req, res) => {
    try {
      const committee = await optimizedStorage.getCommittee(req.params.id);
      if (!committee) {
        return res.status(404).json({ error: "Committee not found" });
      }
      res.json(committee);
    } catch (error) {
      console.error("Error fetching committee:", error);
      res.status(500).json({ error: "Failed to fetch committee" });
    }
  });

  // Committee events endpoints
  app.get("/api/committees/:id/events", isAuthenticated, async (req, res) => {
    try {
      const committeeId = req.params.id;
      const months = parseInt(req.query.months as string) || 3;
      
      const events = await optimizedStorage.getCommitteeEvents(committeeId, months);
      res.json(events);
    } catch (error) {
      console.error("Error fetching committee events:", error);
      res.status(500).json({ error: "Failed to fetch committee events" });
    }
  });
  
  // Export endpoints with strict rate limiting
  app.get("/api/export/meps/csv", exportRateLimit, isAuthenticated, async (req, res) => {
    try {
      const filters = searchFiltersSchema.parse(req.query);
      const { page, limit, ...searchFilters } = filters;
      
      const csvContent = await exportService.exportMEPsToCSV(searchFilters);
      const filename = exportService.generateFilename('csv', 'meps');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting MEPs to CSV:", error);
      res.status(500).json({ error: "Failed to export MEPs to CSV" });
    }
  });
  
  app.get("/api/export/meps/json", exportRateLimit, isAuthenticated, async (req, res) => {
    try {
      const filters = searchFiltersSchema.parse(req.query);
      const { page, limit, ...searchFilters } = filters;
      
      const jsonData = await exportService.exportMEPsToJSON(searchFilters);
      const filename = exportService.generateFilename('json', 'meps');
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(jsonData);
    } catch (error) {
      console.error("Error exporting MEPs to JSON:", error);
      res.status(500).json({ error: "Failed to export MEPs to JSON" });
    }
  });
  
  app.get("/api/export/committees/csv", exportRateLimit, isAuthenticated, async (req, res) => {
    try {
      const csvContent = await exportService.exportCommitteesToCSV();
      const filename = exportService.generateFilename('csv', 'committees');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting committees to CSV:", error);
      res.status(500).json({ error: "Failed to export committees to CSV" });
    }
  });
  
  // Data sync endpoints (for manual triggers and status)
  app.post("/api/sync/trigger", isAuthenticated, async (req, res) => {
    try {
      // Start sync in background
      dataSyncService.syncAllData().catch(error => {
        console.error("Background sync failed:", error);
      });
      
      res.json({ message: "Data synchronization started" });
    } catch (error) {
      console.error("Error starting data sync:", error);
      res.status(500).json({ error: "Failed to start data synchronization" });
    }
  });

  app.get("/api/sync/test-connection", isAuthenticated, async (req, res) => {
    try {
      const isConnected = await dataSyncService.testConnection();
      res.json({ 
        connected: isConnected,
        message: isConnected ? "EU Parliament API connection successful" : "EU Parliament API connection failed"
      });
    } catch (error) {
      console.error("Error testing API connection:", error);
      res.status(500).json({ error: "Failed to test API connection" });
    }
  });
  
  app.get("/api/sync/status", isAuthenticated, async (req, res) => {
    try {
      const latestUpdate = await optimizedStorage.getLatestDataUpdate();
      const schedulerStatus = schedulerService.getStatus();
      res.json({ 
        lastSync: latestUpdate || { status: "never_run" },
        scheduler: schedulerStatus
      });
    } catch (error) {
      console.error("Error fetching sync status:", error);
      res.status(500).json({ error: "Failed to fetch sync status" });
    }
  });

  // Scheduler management endpoints
  app.post("/api/scheduler/trigger", isAuthenticated, async (req, res) => {
    try {
      const result = await schedulerService.triggerManualSync();
      res.json(result);
    } catch (error) {
      console.error("Error triggering manual sync:", error);
      res.status(500).json({ error: "Failed to trigger manual sync" });
    }
  });

  // Data cleanup endpoints
  app.post("/api/cleanup/run", isAuthenticated, async (req, res) => {
    try {
      logger.info("Manual data cleanup triggered", 'API');
      const result = await dataCleanupService.runFullCleanup();
      res.json(result);
    } catch (error) {
      logger.error("Error running data cleanup", 'API', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ error: "Failed to run data cleanup" });
    }
  });

  app.get("/api/cleanup/status", isAuthenticated, async (req, res) => {
    try {
      // Get current duplicate count
      const duplicateQuery = await db.execute(sql`
        SELECT COUNT(*) as total_meps, COUNT(DISTINCT full_name) as unique_names
        FROM meps WHERE is_active = true
      `);
      const stats = duplicateQuery.rows[0] as any;
      const duplicatesCount = stats.total_meps - stats.unique_names;
      
      res.json({ 
        duplicatesDetected: duplicatesCount,
        totalMEPs: stats.total_meps,
        uniqueNames: stats.unique_names,
        needsCleanup: duplicatesCount > 0
      });
    } catch (error) {
      logger.error("Error checking cleanup status", 'API', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ error: "Failed to check cleanup status" });
    }
  });

  app.get("/api/scheduler/status", isAuthenticated, async (req, res) => {
    try {
      const status = schedulerService.getStatus();
      res.json(status);
    } catch (error) {
      console.error("Error fetching scheduler status:", error);
      res.status(500).json({ error: "Failed to fetch scheduler status" });
    }
  });
  
  // Filter options endpoints
  app.get("/api/filters/countries", isAuthenticated, async (req, res) => {
    try {
      // Use caching for filter options
      const cacheKey = 'filter_countries';
      let countries = apiCache.get<Array<{ code: string; name: string }>>(cacheKey);
      
      if (!countries) {
        const { meps } = await optimizedStorage.getMEPs({ limit: 1000 });
        const uniqueCountries = Array.from(new Set(meps.map(mep => mep.country))).sort();
        countries = uniqueCountries.map(country => ({ code: country, name: country }));
        apiCache.set(cacheKey, countries, 10 * 60 * 1000); // 10 minutes cache
      }
      
      res.json(countries);
    } catch (error) {
      console.error("Error fetching countries:", error);
      res.status(500).json({ error: "Failed to fetch countries" });
    }
  });
  
  app.get("/api/filters/political-groups", isAuthenticated, async (req, res) => {
    try {
      const cacheKey = 'filter_political_groups';
      let groups = apiCache.get<Array<{ code: string; name: string }>>(cacheKey);
      
      if (!groups) {
        const { meps } = await optimizedStorage.getMEPs({ limit: 1000 });
        const uniqueGroups = Array.from(new Set(meps.map(mep => mep.politicalGroupAbbr).filter(Boolean))).sort();
        groups = uniqueGroups.map(group => ({ code: group!, name: group! }));
        apiCache.set(cacheKey, groups, 10 * 60 * 1000); // 10 minutes cache
      }
      
      res.json(groups);
    } catch (error) {
      console.error("Error fetching political groups:", error);
      res.status(500).json({ error: "Failed to fetch political groups" });
    }
  });
  
  app.get("/api/filters/committees", isAuthenticated, async (req, res) => {
    try {
      const cacheKey = 'filter_committees';
      let committees = apiCache.get<Array<{ code: string; name: string }>>(cacheKey);
      
      if (!committees) {
        const { committees: committeesData } = await optimizedStorage.getCommittees(100);
        committees = committeesData.map(committee => ({ 
          code: committee.code, 
          name: committee.name 
        }));
        apiCache.set(cacheKey, committees, 10 * 60 * 1000); // 10 minutes cache
      }
      
      res.json(committees);
    } catch (error) {
      console.error("Error fetching committees:", error);
      res.status(500).json({ error: "Failed to fetch committees" });
    }
  });

  const httpServer = createServer(app);
  
  return httpServer;
}
