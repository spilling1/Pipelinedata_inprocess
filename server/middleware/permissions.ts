import { Request, Response, NextFunction } from 'express';
import { userManagementStorage } from '../storage-users';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    permissions: string[];
    isAdmin: boolean;
  };
}

/**
 * Middleware to check if user has required permission
 */
export function requirePermission(permission: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Skip permission check if user is not authenticated
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get user permissions from database
      const userWithPermissions = await userManagementStorage.getUserWithPermissions(req.user.id);
      
      if (!userWithPermissions) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Check if user has the required permission
      const hasPermission = userWithPermissions.permissions?.includes(permission) || false;
      
      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: permission,
          userPermissions: userWithPermissions.permissions || []
        });
      }

      // Add user info to request for downstream handlers
      req.user = {
        id: userWithPermissions.id,
        email: userWithPermissions.email,
        permissions: userWithPermissions.permissions || [],
        isAdmin: userWithPermissions.role === 'Admin'
      };

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
    // Extract user ID from session or auth header
    const userId = (req as any).session?.passport?.user?.claims?.sub || req.headers['x-user-id'];
    
    if (!userId) {
      return next(); // Continue without user info
    }

    // Get user permissions from database
    const userWithPermissions = await userManagementStorage.getUserWithPermissions(userId);
    
    if (userWithPermissions) {
      req.user = {
        id: userWithPermissions.id,
        email: userWithPermissions.email,
        permissions: userWithPermissions.permissions || [],
        isAdmin: userWithPermissions.role === 'Admin'
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