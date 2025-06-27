import { Request, Response, NextFunction } from 'express';

/**
 * Simple permission middleware that reuses the existing /api/users/me logic
 */
export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract user ID from session (same logic as existing auth)
      const userId = (req as any).session?.passport?.user?.claims?.sub;
      
      if (!userId) {
        // For development, use hardcoded user
        if (process.env.NODE_ENV === 'development') {
          // Check permission for our test user
          const testUserPermissions = ['pipeline', 'marketing', 'sales', 'settings', 'user_management', 'financial', 'reporting', 'people_ops', 'database'];
          if (!testUserPermissions.includes(permission)) {
            return res.status(403).json({ 
              error: 'Insufficient permissions',
              required: permission 
            });
          }
          return next();
        }
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Use the same logic as /api/users/me endpoint to check permissions
      const { userManagementStorage } = await import('../storage-users');
      const userPermissions = await userManagementStorage.getUserPermissions(userId);
      
      if (!userPermissions.includes(permission)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: permission,
          userPermissions: userPermissions
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Internal server error during permission check' });
    }
  };
}

/**
 * Middleware to attach user info to request
 */
export async function attachUserInfo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = extractUserId(req);
    
    if (!userId) {
      return next(); // Continue without user info
    }

    // Get user permissions from database
    const user = await userManagementStorage.getUserPermissions(userId);
    
    if (user) {
      req.user = {
        id: user.user.id,
        email: user.user.email,
        permissions: user.permissions || [],
        isAdmin: user.isAdmin
      };
    }

    next();
  } catch (error) {
    console.error('Error attaching user info:', error);
    next(); // Continue without user info rather than failing
  }
}

/**
 * Middleware to check if user can access any analytics
 */
export const requireAnyAnalytics = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const analyticsPermissions = ['pipeline', 'marketing', 'sales', 'people_ops', 'financial', 'reporting'];
    const hasAnyAnalytics = req.user.permissions.some(p => analyticsPermissions.includes(p));
    
    if (!hasAnyAnalytics) {
      return res.status(403).json({ 
        error: 'No analytics permissions',
        message: 'You need at least one analytics permission to access this resource'
      });
    }

    next();
  } catch (error) {
    console.error('Analytics permission check error:', error);
    res.status(500).json({ error: 'Internal server error during permission check' });
  }
};