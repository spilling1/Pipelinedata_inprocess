import { db } from './db';
import { eq, desc, and, gte, lte, isNotNull, or } from 'drizzle-orm';
import { 
  uploadedFiles,
  snapshots,
  type UploadedFile, 
  type InsertUploadedFile
} from '../shared/schema';

export interface IFilesStorage {
  // Uploaded Files
  getUploadedFile(id: number): Promise<UploadedFile | undefined>;
  createUploadedFile(file: InsertUploadedFile): Promise<UploadedFile>;
  getAllUploadedFiles(): Promise<UploadedFile[]>;
  getUploadedFilesByDateRange(startDate: Date, endDate: Date): Promise<UploadedFile[]>;
  deleteUploadedFile(id: number): Promise<void>;
  deleteSnapshotsByUploadedFile(uploadedFileId: number): Promise<void>;
}

export class PostgreSQLFilesStorage implements IFilesStorage {
  // Uploaded Files methods
  async getUploadedFile(id: number): Promise<UploadedFile | undefined> {
    const result = await db.select().from(uploadedFiles).where(eq(uploadedFiles.id, id)).limit(1);
    return result[0];
  }

  async createUploadedFile(file: InsertUploadedFile): Promise<UploadedFile> {
    const result = await db.insert(uploadedFiles).values(file).returning();
    return result[0];
  }

  async getAllUploadedFiles(): Promise<UploadedFile[]> {
    return await db.select().from(uploadedFiles).orderBy(desc(uploadedFiles.uploadDate));
  }

  async getUploadedFilesByDateRange(startDate: Date, endDate: Date): Promise<UploadedFile[]> {
    return await db.select().from(uploadedFiles)
      .where(and(
        or(
          and(
            gte(uploadedFiles.uploadDate, startDate),
            lte(uploadedFiles.uploadDate, endDate)
          ),
          and(
            isNotNull(uploadedFiles.snapshotDate),
            gte(uploadedFiles.snapshotDate, startDate),
            lte(uploadedFiles.snapshotDate, endDate)
          )
        )
      ))
      .orderBy(desc(uploadedFiles.uploadDate));
  }

  async deleteUploadedFile(id: number): Promise<void> {
    await db.delete(uploadedFiles).where(eq(uploadedFiles.id, id));
  }

  async deleteSnapshotsByUploadedFile(uploadedFileId: number): Promise<void> {
    // First get the uploaded file to find its snapshot date
    const uploadedFile = await this.getUploadedFile(uploadedFileId);
    if (!uploadedFile || !uploadedFile.snapshotDate) return;

    // Delete all snapshots for this specific snapshot date
    const startOfDay = new Date(uploadedFile.snapshotDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(uploadedFile.snapshotDate);
    endOfDay.setHours(23, 59, 59, 999);

    await db.delete(snapshots).where(
      and(
        gte(snapshots.snapshotDate, startOfDay),
        lte(snapshots.snapshotDate, endOfDay)
      )
    );
  }
}

export const filesStorage = new PostgreSQLFilesStorage();