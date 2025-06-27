import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUploadedFileSchema } from "@shared/schema";
import multer from "multer";
import { z } from "zod";
import { setupAuth, isAuthenticated } from "./localAuthBypass";
import { requirePermission } from "./middleware/permissions";
import { parseFileData } from "./utils/fileParser";
import { extractDateFromFilename } from "./utils/fileUtils";
import analyticsRouter from "./routes/analytics";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Register analytics routes
  app.use(analyticsRouter);
  
  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const userData = {
        id: user.claims?.sub || user.id || 'local-dev-user',
        email: user.claims?.email || user.email || 'developer@localhost.com',
        name: user.claims ? `${user.claims.first_name || ''} ${user.claims.last_name || ''}`.trim() : user.name || 'Local Developer',
        firstName: user.claims?.first_name || user.firstName || 'Local',
        lastName: user.claims?.last_name || user.lastName || 'Developer',
        profileImageUrl: user.claims?.profile_image_url || user.profileImageUrl || null
      };
      
      res.json(userData);
    } catch (error) {
      console.error('Error fetching user data:', error);
      res.status(500).json({ error: 'Failed to fetch user data' });
    }
  });

  // File upload routes
  app.get('/api/files', isAuthenticated, async (req, res) => {
    try {
      const files = await storage.getAllUploadedFiles();
      res.json(files);
    } catch (error) {
      console.error('Error fetching files:', error);
      res.status(500).json({ error: 'Failed to fetch files' });
    }
  });

  app.post('/api/upload', isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const filename = req.file.originalname;
      const fileDate = extractDateFromFilename(filename);
      
      if (!fileDate) {
        return res.status(400).json({ 
          error: 'Could not extract date from filename. Please ensure the filename contains a date in format MM-DD-YYYY or MM/DD/YYYY' 
        });
      }

      const fileRecord = await storage.createUploadedFile({
        filename,
        snapshotDate: fileDate,
        recordCount: 0,
        status: 'processed'
      });

      const parsedData = await parseFileData(req.file.buffer, filename);
      
      res.json({
        success: true,
        file: fileRecord,
        stats: {
          opportunities: parsedData.length,
          snapshots: parsedData.length
        }
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to process file' });
    }
  });

  // Opportunity routes
  app.get('/api/opportunities', isAuthenticated, async (req, res) => {
    try {
      const opportunities = await storage.getAllOpportunities();
      const snapshots = await storage.getAllSnapshots();
      
      const opportunitiesWithLatest = opportunities.map(opp => {
        const oppSnapshots = snapshots.filter(s => s.opportunityId === opp.id);
        const latestSnapshot = oppSnapshots.reduce((latest, snapshot) => {
          return snapshot.snapshotDate > latest.snapshotDate ? snapshot : latest;
        }, oppSnapshots[0]);
        
        return {
          ...opp,
          latestSnapshot
        };
      });
      
      res.json(opportunitiesWithLatest);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      res.status(500).json({ error: 'Failed to fetch opportunities' });
    }
  });

  // Settings routes
  app.get("/api/stage-mappings", isAuthenticated, async (req, res) => {
    try {
      const mappings = await storage.getStageMappings();
      res.json(mappings);
    } catch (error) {
      console.error("Error fetching stage mappings:", error);
      res.status(500).json({ error: "Failed to fetch stage mappings" });
    }
  });

  app.post("/api/stage-mappings", isAuthenticated, async (req, res) => {
    try {
      const { mappings } = req.body;
      await storage.setStageMappings(mappings);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating stage mappings:", error);
      res.status(500).json({ error: "Failed to update stage mappings" });
    }
  });

  // Database management routes
  app.post('/api/database/clear', isAuthenticated, requirePermission('admin'), async (req, res) => {
    try {
      await storage.clearAllData();
      res.json({ success: true, message: 'All data cleared successfully' });
    } catch (error) {
      console.error('Error clearing data:', error);
      res.status(500).json({ error: 'Failed to clear data' });
    }
  });

  // Return server
  const server = createServer(app);
  return server;
}