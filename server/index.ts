/**
 * EU MEP Watch - Main Application Server
 * 
 * This is the entry point for the EU Parliament monitoring application server.
 * It configures the Express.js application with all necessary middleware,
 * sets up API routes, authentication, monitoring, and automated data synchronization.
 * 
 * Key Features:
 * - Express.js server with comprehensive middleware stack
 * - Development/production environment configuration
 * - Automatic API request logging and performance monitoring
 * - Error handling with structured responses
 * - Automated EU Parliament data synchronization
 * - Hot module replacement in development via Vite integration
 * 
 * Production Deployment:
 * - Serves on configurable port (default: 5000)
 * - Static file serving for production builds
 * - Comprehensive error handling and logging
 * - Health checks and monitoring endpoints
 * - Automated background tasks and data sync
 * 
 * Security Features:
 * - Request validation and sanitization
 * - Authentication middleware integration
 * - Rate limiting and abuse prevention
 * - CORS configuration for cross-origin requests
 * 
 * @author EU MEP Watch Development Team
 * @since August 2025
 * @version 2.0.0 - Production-ready with monitoring and automation
 */

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { schedulerService } from "./services/scheduler";

/** Main Express application instance */
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Start automated data synchronization scheduler
    schedulerService.start();
    log(`📅 Automated EU Parliament data sync started (daily at 2:00 AM UTC)`);
  });
})();
