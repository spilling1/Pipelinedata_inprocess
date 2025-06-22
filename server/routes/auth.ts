import type { Express } from "express";
import { isAuthenticated } from "../localAuthBypass";

export function registerAuthRoutes(app: Express) {
  // Auth endpoint
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // Handle both Replit user format and local mock user format
      const user = req.user;
      const userData = {
        id: user.claims?.sub || user.id || 'local-dev-user',
        email: user.claims?.email || user.email || 'developer@localhost.com',
        name: user.claims ? `${user.claims.first_name || ''} ${user.claims.last_name || ''}`.trim() : user.name || 'Local Developer',
        firstName: user.claims?.first_name || user.firstName || 'Local',
        lastName: user.claims?.last_name || user.lastName || 'Developer',
        profileImageUrl: user.claims?.profile_image_url || user.profileImageUrl || null
      };
      
      console.log('🔍 Returning user data:', userData);
      res.json(userData);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user data' });
    }
  });
}