import { Router, type Express } from "express";
import { userManagementStorage } from "./storage-users";
import { isAuthenticated } from "./localAuthBypass"; // Use the conditional auth
import { updateUserSchema } from "@shared/schema";
import { z } from "zod";

// Helper function to get user ID from request
const getUserId = (req: any): string | null => {
  // For Replit Auth
  if (req.user?.claims?.sub) {
    return req.user.claims.sub;
  }
  // For local development
  if (req.user?.id) {
    return req.user.id;
  }
  return null;
};

// Permission middleware
const requirePermission = (permission: string) => {
  return async (req: any, res: any, next: any) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const hasPermission = await userManagementStorage.hasPermission(userId, permission);
      const isAdmin = await userManagementStorage.isAdmin(userId);
      
      if (!hasPermission && !isAdmin) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

const requireAdmin = async (req: any, res: any, next: any) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const isAdmin = await userManagementStorage.isAdmin(userId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Admin check failed' });
  }
};

export function registerUserManagementRoutes(app: Express) {
  const router = Router();

  // Get current user's permissions and role info
  router.get('/me', isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const userWithRole = await userManagementStorage.getUserById(userId);
      const permissions = await userManagementStorage.getUserPermissions(userId);
      
      res.json({
        user: userWithRole,
        permissions,
        isAdmin: await userManagementStorage.isAdmin(userId)
      });
    } catch (error) {
      console.error('Error fetching user info:', error);
      res.status(500).json({ error: 'Failed to fetch user information' });
    }
  });

  // Get all users (Admin only)
  router.get('/users', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const users = await userManagementStorage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Get specific user (Admin only)
  router.get('/users/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const user = await userManagementStorage.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  // Update user (Admin only)
  router.put('/users/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const validation = updateUserSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: 'Invalid user data', details: validation.error.errors });
      }

      const updatedUser = await userManagementStorage.updateUser(req.params.id, validation.data);
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  // Deactivate user (Admin only)
  router.post('/users/:id/deactivate', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await userManagementStorage.deactivateUser(req.params.id);
      res.json({ message: 'User deactivated successfully' });
    } catch (error) {
      console.error('Error deactivating user:', error);
      res.status(500).json({ error: 'Failed to deactivate user' });
    }
  });

  // Activate user (Admin only)
  router.post('/users/:id/activate', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await userManagementStorage.activateUser(req.params.id);
      res.json({ message: 'User activated successfully' });
    } catch (error) {
      console.error('Error activating user:', error);
      res.status(500).json({ error: 'Failed to activate user' });
    }
  });

  // Get all roles (Admin only)
  router.get('/roles', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const roles = await userManagementStorage.getAllRoles();
      res.json(roles);
    } catch (error) {
      console.error('Error fetching roles:', error);
      res.status(500).json({ error: 'Failed to fetch roles' });
    }
  });

  // Create role (Admin only)
  router.post('/roles', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { name, displayName, description, permissions } = req.body;
      
      if (!name || !displayName || !Array.isArray(permissions)) {
        return res.status(400).json({ error: 'Name, displayName, and permissions array are required' });
      }

      const newRole = await userManagementStorage.createRole({
        name,
        displayName,
        description,
        permissions
      });
      
      res.status(201).json(newRole);
    } catch (error) {
      console.error('Error creating role:', error);
      res.status(500).json({ error: 'Failed to create role' });
    }
  });

  // Update role (Admin only)
  router.put('/roles/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const roleId = parseInt(req.params.id);
      const { displayName, description, permissions } = req.body;
      
      const updatedRole = await userManagementStorage.updateRole(roleId, {
        displayName,
        description,
        permissions
      });
      
      res.json(updatedRole);
    } catch (error) {
      console.error('Error updating role:', error);
      res.status(500).json({ error: 'Failed to update role' });
    }
  });

  // Delete role (Admin only)
  router.delete('/roles/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const roleId = parseInt(req.params.id);
      await userManagementStorage.deleteRole(roleId);
      res.json({ message: 'Role deleted successfully' });
    } catch (error) {
      console.error('Error deleting role:', error);
      res.status(500).json({ error: 'Failed to delete role' });
    }
  });

  // Get permission categories (Admin only)
  router.get('/permissions', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const categories = await userManagementStorage.getAllPermissionCategories();
      res.json(categories);
    } catch (error) {
      console.error('Error fetching permission categories:', error);
      res.status(500).json({ error: 'Failed to fetch permission categories' });
    }
  });

  // Mount all user management routes under /users
  app.use('/api/users', router);
  
  console.log('✅ User management routes registered successfully');
}