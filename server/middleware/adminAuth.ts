import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

/**
 * Admin authentication middleware
 * Ensures only users with admin role can access protected routes
 */
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // First check if user is authenticated
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userId = (req.user as any).claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Invalid user session" });
    }

    // Get user from database to check role
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Check if user has admin role
    if (user.role !== "admin") {
      return res.status(403).json({ 
        message: "Admin access required", 
        userRole: user.role 
      });
    }

    // User is admin, proceed
    next();
  } catch (error) {
    console.error("Admin authentication error:", error);
    res.status(500).json({ message: "Authentication check failed" });
  }
};