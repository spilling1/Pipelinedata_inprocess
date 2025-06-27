import { db } from './db';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { 
  snapshots,
  type Snapshot, 
  type InsertSnapshot
} from '../shared/schema';

export interface ISnapshotsStorage {
  // Snapshots
  getSnapshot(id: number): Promise<Snapshot | undefined>;
  getSnapshotsByOpportunity(opportunityId: number): Promise<Snapshot[]>;
  getSnapshotsByDateRange(startDate: Date, endDate: Date): Promise<Snapshot[]>;
  createSnapshot(snapshot: InsertSnapshot): Promise<Snapshot>;
  getAllSnapshots(): Promise<Snapshot[]>;
  getLatestSnapshotByOpportunity(opportunityId: number): Promise<Snapshot | undefined>;
}

export class PostgreSQLSnapshotsStorage implements ISnapshotsStorage {
  // Snapshot methods
  async getSnapshot(id: number): Promise<Snapshot | undefined> {
    const result = await db.select().from(snapshots).where(eq(snapshots.id, id)).limit(1);
    return result[0];
  }

  async getSnapshotsByOpportunity(opportunityId: number): Promise<Snapshot[]> {
    return await db.select().from(snapshots)
      .where(eq(snapshots.opportunityId, opportunityId))
      .orderBy(desc(snapshots.snapshotDate));
  }

  async getSnapshotsByDateRange(startDate: Date, endDate: Date): Promise<Snapshot[]> {
    return await db.select().from(snapshots)
      .where(and(
        gte(snapshots.snapshotDate, startDate),
        lte(snapshots.snapshotDate, endDate)
      ))
      .orderBy(desc(snapshots.snapshotDate));
  }

  async createSnapshot(snapshot: InsertSnapshot): Promise<Snapshot> {
    const result = await db.insert(snapshots).values(snapshot).returning();
    return result[0];
  }

  async getAllSnapshots(): Promise<Snapshot[]> {
    return await db.select().from(snapshots).orderBy(desc(snapshots.snapshotDate));
  }

  async getLatestSnapshotByOpportunity(opportunityId: number): Promise<Snapshot | undefined> {
    const result = await db.select().from(snapshots)
      .where(eq(snapshots.opportunityId, opportunityId))
      .orderBy(desc(snapshots.snapshotDate))
      .limit(1);
    return result[0];
  }
}

export const snapshotsStorage = new PostgreSQLSnapshotsStorage();