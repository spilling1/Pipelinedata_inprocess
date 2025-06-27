import type { RequestHandler } from "express";
import { isAuthenticated as replitAuth } from "./replitAuth";

// Mock user for local development - use an actual admin user
const mockUser = {
  claims: {
    sub: "40293358", // sampilling@higharc.com user ID
    email: "sampilling@higharc.com",
    first_name: "Sam",
    last_name: "Pilling",
    profile_image_url: null
  },
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_at: Math.floor(Date.now() / 1000) + 86400 // Expires in 24 hours
};

// Local development authentication bypass
const localAuthBypass: RequestHandler = (req, res, next) => {
  console.log("🔓 Local development: Bypassing authentication");
  
  // Mock the user and authentication state
  req.user = mockUser;
  
  // Mock the isAuthenticated function with proper typing
  (req as any).isAuthenticated = () => true;
  
  // Mock the logout function with proper overloads
  (req as any).logout = (optionsOrCallback?: any, callback?: any) => {
    req.user = undefined;
    if (typeof optionsOrCallback === 'function') {
      optionsOrCallback();
    } else if (callback) {
      callback();
    }
  };
  
  next();
};

// Export conditional authentication middleware
export const isAuthenticated: RequestHandler = (req, res, next) => {
  // Check if we're running in local development mode
  const isLocalDev = process.env.REPLIT_DOMAINS === "localhost:5000" || 
                     process.env.NODE_ENV === "development" && 
                     !process.env.REPL_ID?.startsWith("repl-");
  
  if (isLocalDev) {
    console.log("🔓 Using local development authentication bypass");
    return localAuthBypass(req, res, next);
  } else {
    console.log("🔐 Using Replit authentication");
    return replitAuth(req, res, next);
  }
};

// Export conditional setupAuth function
export const setupAuth = async (app: any) => {
  const isLocalDev = process.env.REPLIT_DOMAINS === "localhost:5000" || 
                     process.env.NODE_ENV === "development" && 
                     !process.env.REPL_ID?.startsWith("repl-");
  
  if (isLocalDev) {
    console.log("🔓 Skipping Replit authentication setup for local development");
    // For local development, we'll just use basic session middleware without Replit auth
    const session = (await import('express-session')).default;
    app.use(session({
      secret: 'local-dev-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
    }));
    return;
  } else {
    console.log("🔐 Setting up Replit authentication");
    const { setupAuth: replitSetupAuth } = await import("./replitAuth");
    return replitSetupAuth(app);
  }
};

console.log(`🔧 Authentication mode: ${process.env.REPLIT_DOMAINS === "localhost:5000" ? "LOCAL BYPASS" : "REPLIT AUTH"}`); 