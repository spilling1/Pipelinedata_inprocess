import { Request, Response, NextFunction } from 'express';

/**
 * Simple permission middleware that checks user permissions before allowing access
 */
export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract user ID from session (same logic as existing auth)
      const userId = (req as any).session?.passport?.user?.claims?.sub;
      
      if (!userId) {
        // For development, use hardcoded user (sampilling@higharc.com has all permissions)
        if (process.env.NODE_ENV === 'development') {
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
      
      // First check if user is active
      const user = await userManagementStorage.getUserById(userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      if (!user.isActive) {
        return res.status(403).json({ 
          error: 'Account deactivated',
          message: 'Your account has been deactivated. Please contact an administrator.'
        });
      }
      
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