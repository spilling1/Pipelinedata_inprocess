import { db } from './db';
import { eq, sql } from 'drizzle-orm';
import { 
  users,
  type User,
  type UpsertUser
} from '../shared/schema';

export interface IAuthStorage {
  // User operations for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

export class PostgreSQLAuthStorage implements IAuthStorage {
  // User operations for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if user already exists
    const existingUser = await this.getUser(userData.id);
    const now = new Date();
    
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        // Only set Default role for new users, preserve existing users' roles
        role: existingUser ? existingUser.role : 'Default',
        lastLogin: now
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: now,
          lastLogin: now, // Update last login time on every authentication
          // Don't update role for existing users
          role: sql`${users.role}`
        },
      })
      .returning();
    return user;
  }
}

export const authStorage = new PostgreSQLAuthStorage();