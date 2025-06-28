import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerMarketingGraphRoutes } from './routes-mktg';
import { registerComparativeRoutes } from './routes-register-comparative';
import { registerSalesRoutes } from './routes-sales';
import { registerUserManagementRoutes } from './routes-users';
import { setupVite, serveStatic, log } from "./vite";
import { db } from "./db";
import { sql } from "drizzle-orm";

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
  // Test database connection
  try {
    await db.execute(sql`SELECT NOW()`);
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
  
  // Setup authentication first before any routes
  console.log('🔐 Setting up authentication');
  const { setupAuth } = await import('./localAuthBypass');
  await setupAuth(app);
  console.log('✅ Authentication setup completed');
  
  // Register marketing graph routes first
  console.log('🔗 Registering marketing graph routes');
  registerMarketingGraphRoutes(app);
  console.log('✅ Marketing graph routes registered successfully');

  // Register comparative analytics routes
  console.log('🔗 Registering marketing comparative analytics routes');
  registerComparativeRoutes(app);
  console.log('✅ Marketing comparative analytics routes registered successfully');

  // Register sales routes
  console.log('🔗 Registering sales routes');
  registerSalesRoutes(app);
  console.log('✅ Sales routes registered successfully');

  // Register user management routes
  console.log('🔗 Registering user management routes');
  registerUserManagementRoutes(app);
  console.log('✅ User management routes registered successfully');

  // Register main routes
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

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  
  // Configure server binding based on environment
  const isLocalDev = process.env.REPLIT_DOMAINS === "localhost:5000";
  const serverConfig = isLocalDev 
    ? {
        port,
        host: "localhost"  // Use localhost for local development on Windows
      }
    : {
        port,
        host: "0.0.0.0",
        reusePort: true   // Keep reusePort for Replit environment
      };
  
  server.listen(serverConfig, () => {
    log(`serving on ${serverConfig.host}:${port}`);
  });
})();
