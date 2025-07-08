import { db } from "./db";
import { users, roles, permissionCategories, type User, type Role, type PermissionCategory, type UpdateUser } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export class UserManagementStorage {
  // User Management
  async getAllUsers(): Promise<Array<User & { roleInfo?: any }>> {
    const allUsers = await db
      .select()
      .from(users)
      .orderBy(users.email);

    // Get role information for each user
    const usersWithRoles = await Promise.all(
      allUsers.map(async (user) => {
        if (user.role) {
          const roleInfo = await db
            .select()
            .from(roles)
            .where(eq(roles.name, user.role.toLowerCase()))
            .limit(1);
          
          return {
            ...user,
            roleInfo: roleInfo[0] || undefined
          };
        }
        return user;
      })
    );

    return usersWithRoles;
  }

  async getUserById(id: string): Promise<(User & { roleInfo?: any }) | undefined> {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (user.length === 0) return undefined;

    const userData = user[0];
    let roleInfo = null;
    
    if (userData.role) {
      const roleResult = await db
        .select()
        .from(roles)
        .where(eq(roles.name, userData.role.toLowerCase()))
        .limit(1);
      
      roleInfo = roleResult[0] || null;
    }

    return {
      ...userData,
      roleInfo: roleInfo || undefined
    };
  }

  async updateUser(id: string, updates: Partial<UpdateUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();

    return updatedUser;
  }

  async deactivateUser(id: string): Promise<void> {
    await db
      .update(users)
      .set({
        isActive: 0,
        updatedAt: new Date()
      })
      .where(eq(users.id, id));
  }

  async activateUser(id: string): Promise<void> {
    await db
      .update(users)
      .set({
        isActive: 1,
        updatedAt: new Date()
      })
      .where(eq(users.id, id));
  }

  // Role Management
  async getAllRoles(): Promise<Role[]> {
    return await db
      .select()
      .from(roles)
      .where(eq(roles.isActive, 1))
      .orderBy(roles.displayName);
  }

  async getRoleByName(name: string): Promise<Role | undefined> {
    const result = await db
      .select()
      .from(roles)
      .where(eq(roles.name, name.toLowerCase()))
      .limit(1);

    return result[0];
  }

  async createRole(roleData: {
    name: string;
    displayName: string;
    description?: string;
    permissions: string[];
  }): Promise<Role> {
    const [newRole] = await db
      .insert(roles)
      .values({
        name: roleData.name.toLowerCase(),
        displayName: roleData.displayName,
        description: roleData.description,
        permissions: roleData.permissions,
        isActive: 1
      })
      .returning();

    return newRole;
  }

  async updateRole(id: number, updates: {
    displayName?: string;
    description?: string;
    permissions?: string[];
  }): Promise<Role> {
    const [updatedRole] = await db
      .update(roles)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(roles.id, id))
      .returning();

    return updatedRole;
  }

  async deleteRole(id: number): Promise<void> {
    await db
      .update(roles)
      .set({
        isActive: 0,
        updatedAt: new Date()
      })
      .where(eq(roles.id, id));
  }

  // Permission Management
  async getAllPermissionCategories(): Promise<PermissionCategory[]> {
    return await db
      .select()
      .from(permissionCategories)
      .where(eq(permissionCategories.isActive, 1))
      .orderBy(permissionCategories.displayName);
  }

  // Permission Check Helper
  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.getUserById(userId);
    if (!user || !user.roleInfo) {
      return [];
    }

    // Admin users automatically get all permissions
    if (user.roleInfo.name === 'admin') {
      return [
        'pipeline',
        'marketing', 
        'marketing_comparative',
        'sales',
        'people_ops',
        'builder_analytics',
        'database',
        'settings',
        'user_management',
        'financial',
        'reporting',
        'customer_adoption',
        'implementation_status'
      ];
    }

    return Array.isArray(user.roleInfo.permissions) 
      ? user.roleInfo.permissions as string[]
      : [];
  }

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(permission);
  }

  async hasAnyPermission(userId: string, requiredPermissions: string[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return requiredPermissions.some(permission => userPermissions.includes(permission));
  }

  // Utility method to check if user is admin
  async isAdmin(userId: string): Promise<boolean> {
    const user = await this.getUserById(userId);
    return user?.role?.toLowerCase() === 'admin' || false;
  }
}

export const userManagementStorage = new UserManagementStorage();