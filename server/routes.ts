import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { dataSyncService } from "./services/dataSync";
import { exportService } from "./services/exportService";
import { z } from "zod";

const searchFiltersSchema = z.object({
  search: z.string().optional(),
  country: z.string().optional(),
  politicalGroup: z.string().optional(),
  committee: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50)
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard statistics" });
    }
  });
  
  // Recent changes
  app.get("/api/dashboard/recent-changes", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const changes = await storage.getRecentChanges(limit);
      res.json(changes);
    } catch (error) {
      console.error("Error fetching recent changes:", error);
      res.status(500).json({ error: "Failed to fetch recent changes" });
    }
  });
  
  // MEPs endpoints
  app.get("/api/meps", async (req, res) => {
    try {
      const filters = searchFiltersSchema.parse(req.query);
      const { page, limit, ...searchFilters } = filters;
      const offset = (page - 1) * limit;
      
      const result = await storage.getMEPs({
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
      console.error("Error fetching MEPs:", error);
      res.status(500).json({ error: "Failed to fetch MEPs" });
    }
  });
  
  app.get("/api/meps/:id", async (req, res) => {
    try {
      const mep = await storage.getMEP(req.params.id);
      if (!mep) {
        return res.status(404).json({ error: "MEP not found" });
      }
      res.json(mep);
    } catch (error) {
      console.error("Error fetching MEP:", error);
      res.status(500).json({ error: "Failed to fetch MEP" });
    }
  });
  
  // Committees endpoints
  app.get("/api/committees", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;
      
      const result = await storage.getCommittees(limit, offset);
      
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
  
  app.get("/api/committees/:id", async (req, res) => {
    try {
      const committee = await storage.getCommittee(req.params.id);
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
  app.get("/api/committees/:id/events", async (req, res) => {
    try {
      const committeeId = req.params.id;
      const months = parseInt(req.query.months as string) || 3;
      
      const events = await storage.getCommitteeEvents(committeeId, months);
      res.json(events);
    } catch (error) {
      console.error("Error fetching committee events:", error);
      res.status(500).json({ error: "Failed to fetch committee events" });
    }
  });
  
  // Export endpoints
  app.get("/api/export/meps/csv", async (req, res) => {
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
  
  app.get("/api/export/meps/json", async (req, res) => {
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
  
  app.get("/api/export/committees/csv", async (req, res) => {
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
  app.post("/api/sync/trigger", async (req, res) => {
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
  
  app.get("/api/sync/status", async (req, res) => {
    try {
      const latestUpdate = await storage.getLatestDataUpdate();
      res.json(latestUpdate || { status: "never_run" });
    } catch (error) {
      console.error("Error fetching sync status:", error);
      res.status(500).json({ error: "Failed to fetch sync status" });
    }
  });
  
  // Filter options endpoints
  app.get("/api/filters/countries", async (req, res) => {
    try {
      // This would be better with a specific query, but for now we'll get unique countries from MEPs
      const { meps } = await storage.getMEPs({ limit: 1000 });
      const countries = Array.from(new Set(meps.map(mep => mep.country))).sort();
      res.json(countries.map(country => ({ code: country, name: country })));
    } catch (error) {
      console.error("Error fetching countries:", error);
      res.status(500).json({ error: "Failed to fetch countries" });
    }
  });
  
  app.get("/api/filters/political-groups", async (req, res) => {
    try {
      const { meps } = await storage.getMEPs({ limit: 1000 });
      const groups = Array.from(new Set(meps.map(mep => mep.politicalGroupAbbr).filter(Boolean))).sort();
      res.json(groups.map(group => ({ code: group, name: group })));
    } catch (error) {
      console.error("Error fetching political groups:", error);
      res.status(500).json({ error: "Failed to fetch political groups" });
    }
  });
  
  app.get("/api/filters/committees", async (req, res) => {
    try {
      const { committees } = await storage.getCommittees(100);
      res.json(committees.map(committee => ({ 
        code: committee.code, 
        name: committee.name 
      })));
    } catch (error) {
      console.error("Error fetching committees:", error);
      res.status(500).json({ error: "Failed to fetch committees" });
    }
  });

  const httpServer = createServer(app);
  
  return httpServer;
}
