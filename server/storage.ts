import { db } from './db';
import { eq, desc, asc, and, sql, gte, lte, isNull, isNotNull, or, inArray, like } from 'drizzle-orm';
import { 
  opportunities, 
  snapshots, 
  uploadedFiles,
  users,
  type Opportunity, 
  type Snapshot, 
  type UploadedFile, 
  type User,
  type InsertOpportunity, 
  type InsertSnapshot, 
  type InsertUploadedFile,
  type UpsertUser
} from '../shared/schema';

export interface IStorage {
  // User operations for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Opportunities
  getOpportunity(id: number): Promise<Opportunity | undefined>;
  getOpportunityByName(name: string): Promise<Opportunity | undefined>;
  getOpportunityById(opportunityId: string): Promise<Opportunity | undefined>;
  createOpportunity(opportunity: InsertOpportunity): Promise<Opportunity>;
  getAllOpportunities(): Promise<Opportunity[]>;

  // Snapshots
  getSnapshot(id: number): Promise<Snapshot | undefined>;
  getSnapshotsByOpportunity(opportunityId: number): Promise<Snapshot[]>;
  getSnapshotsByDateRange(startDate: Date, endDate: Date): Promise<Snapshot[]>;
  createSnapshot(snapshot: InsertSnapshot): Promise<Snapshot>;
  getAllSnapshots(): Promise<Snapshot[]>;
  getLatestSnapshotByOpportunity(opportunityId: number): Promise<Snapshot | undefined>;

  // Uploaded Files
  getUploadedFile(id: number): Promise<UploadedFile | undefined>;
  createUploadedFile(file: InsertUploadedFile): Promise<UploadedFile>;
  getAllUploadedFiles(): Promise<UploadedFile[]>;
  getUploadedFilesByDateRange(startDate: Date, endDate: Date): Promise<UploadedFile[]>;
  deleteUploadedFile(id: number): Promise<void>;
  deleteSnapshotsByUploadedFile(uploadedFileId: number): Promise<void>;

  // Analytics
  getPipelineValueByDate(startDate?: string, endDate?: string): Promise<Array<{ date: Date; value: number }>>;
  getStageDistribution(): Promise<Array<{ stage: string; count: number; value: number }>>;
  getYear1ArrDistribution(): Promise<Array<{ stage: string; count: number; value: number }>>;
  getFiscalYearPipeline(): Promise<Array<{ fiscalYear: string; value: number }>>;
  getFiscalQuarterPipeline(): Promise<Array<{ fiscalQuarter: string; value: number }>>;
  getMonthlyPipeline(): Promise<Array<{ month: string; value: number }>>;
  getDealMovements(days: number): Promise<Array<{ 
    opportunityName: string; 
    from: string; 
    to: string; 
    date: Date; 
    value: number 
  }>>;

  // Stage timing analysis
  getStageTimingData(startDate?: string, endDate?: string): Promise<Array<{ stage: string; avgDays: number; dealCount: number }>>;



  // Date slippage analysis
  getDateSlippageData(): Promise<Array<{ 
    stageName: string;
    avgSlippageDays: number;
    dealCount: number;
    quarterEndSlippageRate: number;
    totalSlippedValue: number;
    worstCase: {
      opportunityName: string;
      slippageDays: number;
      value: number;
    } | null;
  }>>;

  // Validation stage analysis
  getValidationAnalysis(): Promise<{
    totalValidationValue: number;
    totalValidationCount: number;
    avgValidationDealSize: number;
    conversionToLaterStage: number;
    conversionToClosedLost: number;
    conversionRate: number;
    stageBreakdown: Array<{
      fromStage: string;
      toLaterStage: number;
      toClosedLost: number;
      totalDeals: number;
      conversionRate: number;
    }>;
    topValidationOpportunities: Array<{
      opportunityName: string;
      clientName?: string;
      value: number;
      daysInValidation: number;
      stage: string;
    }>;
  }>;

  // Closing probability analysis
  getClosingProbabilityData(startDate?: string, endDate?: string): Promise<Array<{
    stage: string;
    totalDeals: number;
    closedWon: number;
    closedLost: number;
    winRate: number;
    conversionToNext: number;
  }>>;

  // Loss reason analysis
  getLossReasonAnalysis(startDate?: string, endDate?: string): Promise<Array<{
    reason: string;
    count: number;
    totalValue: number;
    percentage: number;
  }>>;
  
  // Loss reasons by previous stage
  getLossReasonByPreviousStage(startDate?: string, endDate?: string): Promise<Array<{
    reason: string;
    previousStage: string;
    count: number;
    totalValue: number;
    percentage: number;
  }>>;

  // Closed Won FY data
  getClosedWonFYData(startDate?: string, endDate?: string): Promise<{
    totalValue: number;
    totalCount: number;
    growth: number;
    deals: Array<{
      opportunityName: string;
      clientName?: string;
      value: number;
      closeDate: Date;
    }>;
  }>;

  // Duplicate opportunities analysis (for specific end date)
  getDuplicateOpportunities(endDate?: string): Promise<Array<{
    clientName: string;
    opportunities: Array<{
      id: number;
      name: string;
      opportunityId: string;
      owner?: string;
      isActive?: boolean;
      latestSnapshot?: {
        stage: string;
        amount: number;
      };
    }>;
    totalValue: number;
    totalOpportunitiesCount: number;
    activeOpportunitiesCount: number;
  }>>;

  // Settings
  getStageMappings(): Promise<Array<{ from: string; to: string }>>;
  setStageMappings(mappings: Array<{ from: string; to: string }>): Promise<void>;
  getProbabilityConfigs(): Promise<Array<{ stage: string; confidence: string; probability: number }>>;
  setProbabilityConfigs(configs: Array<{ stage: string; confidence: string; probability: number }>): Promise<void>;

  // Data management
  clearAllData(): Promise<void>;
  clearDataByDate(snapshotDate: Date): Promise<void>;

  // New stage slippage analysis
  getStageSlippageAnalysis(startDate?: Date, endDate?: Date): Promise<Array<{
    stageName: string;
    avgSlippageDays: number;
    opportunityCount: number;
    totalSlippageDays: number;
  }>>;

  // Quarter retention analysis
  getQuarterRetentionAnalysis(startDate?: Date, endDate?: Date): Promise<Array<{
    stageName: string;
    totalOpportunities: number;
    sameQuarterClosures: number;
    retentionRate: number;
  }>>;

  // Value changes by stage
  getValueChangesByStage(startDate?: Date, endDate?: Date): Promise<Array<{
    fromStage: string;
    toStage: string;
    opportunityCount: number;
    avgYear1ArrChange: number;
    avgTotalContractValueChange: number;
    totalYear1ArrChange: number;
    totalContractValueChange: number;
    year1ArrChangePercentage: number;
    totalContractValueChangePercentage: number;
  }>>;

  // Recent losses
  getRecentLosses(limit?: number): Promise<Array<{
    opportunityName: string;
    clientName?: string;
    lossReason: string;
    year1Value: number;
    closeDate: string;
    previousStage: string;
  }>>;

  // Sales methods
  getSalesRepsList(): Promise<Array<{ owner: string; count: number }>>;
  getClientsList(): Promise<Array<{ clientName: string; count: number }>>;
  getSalesPipelineValueByDate(filters: any): Promise<Array<{ date: Date; value: number }>>;
  getSalesStageDistribution(filters: any): Promise<Array<{ stage: string; count: number; value: number }>>;
  getSalesFiscalYearPipeline(filters: any): Promise<Array<{ fiscalYear: string; value: number }>>;
  getSalesFiscalQuarterPipeline(filters: any): Promise<Array<{ fiscalQuarter: string; value: number }>>;
  getSalesMonthlyPipeline(filters: any): Promise<Array<{ month: string; value: number }>>;
  getSalesStageTimingData(filters: any): Promise<Array<{ stage: string; avgDays: number; dealCount: number }>>;
  getSalesDateSlippageData(filters: any): Promise<Array<any>>;
  getSalesDuplicateOpportunities(filters: any): Promise<Array<any>>;
  getSalesValueChanges(filters: any): Promise<Array<any>>;
  getSalesClosingProbabilityData(filters: any): Promise<Array<any>>;
  getSalesStageFunnel(filters: any): Promise<Array<any>>;
  getSalesWinRateAnalysis(filters: any): Promise<any>;
  getSalesCloseRateAnalysis(filters: any): Promise<any>;
  getSalesLossReasons(filters: any): Promise<Array<any>>;
  getSalesOpportunities(filters: any): Promise<Array<any>>;
  getSalesStageFlow(filters: any): Promise<any>;
  getSalesLossAnalysis(filters: any): Promise<any>;
  getSalesRecentLosses(filters: any): Promise<Array<any>>;
}

export class PostgreSQLStorage implements IStorage {
  // User operations for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if user already exists
    const existingUser = await this.getUser(userData.id);
    
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        // Only set Default role for new users, preserve existing users' roles
        role: existingUser ? existingUser.role : 'Default'
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
          // Don't update role for existing users
          role: sql`${users.role}`
        },
      })
      .returning();
    return user;
  }

  private stageMappings: Array<{ from: string; to: string }> = [
    { from: 'develop', to: 'Developing Champions' },
    { from: 'decision', to: 'Negotiation/Review' }
  ];
  
  private probabilityConfigs: Array<{ stage: string; confidence: string; probability: number }> = [
    { stage: 'Qualify', confidence: 'Upside', probability: 10 },
    { stage: 'Qualify', confidence: 'Best Case', probability: 20 },
    { stage: 'Qualify', confidence: 'Commit', probability: 30 },
    { stage: 'Developing Champions', confidence: 'Upside', probability: 30 },
    { stage: 'Developing Champions', confidence: 'Best Case', probability: 40 },
    { stage: 'Developing Champions', confidence: 'Commit', probability: 50 },
    { stage: 'Value Proposition', confidence: 'Upside', probability: 40 },
    { stage: 'Value Proposition', confidence: 'Best Case', probability: 50 },
    { stage: 'Value Proposition', confidence: 'Commit', probability: 60 },
    { stage: 'Business Case', confidence: 'Upside', probability: 50 },
    { stage: 'Business Case', confidence: 'Best Case', probability: 60 },
    { stage: 'Business Case', confidence: 'Commit', probability: 70 },
    { stage: 'Validation', confidence: 'Upside', probability: 60 },
    { stage: 'Validation', confidence: 'Best Case', probability: 70 },
    { stage: 'Validation', confidence: 'Commit', probability: 80 },
    { stage: 'Negotiation/Review', confidence: 'Upside', probability: 80 },
    { stage: 'Negotiation/Review', confidence: 'Best Case', probability: 90 },
    { stage: 'Negotiation/Review', confidence: 'Commit', probability: 95 },
    { stage: 'Closed Won', confidence: 'Closed', probability: 100 },
    { stage: 'Otherwise', confidence: '', probability: 0 }
  ];

  // Opportunity methods
  async getOpportunity(id: number): Promise<Opportunity | undefined> {
    const result = await db.select().from(opportunities).where(eq(opportunities.id, id)).limit(1);
    return result[0];
  }

  async getOpportunityByName(name: string): Promise<Opportunity | undefined> {
    const result = await db.select().from(opportunities).where(eq(opportunities.name, name)).limit(1);
    return result[0];
  }

  async getOpportunityById(opportunityId: string): Promise<Opportunity | undefined> {
    const result = await db.select().from(opportunities).where(eq(opportunities.opportunityId, opportunityId)).limit(1);
    return result[0];
  }

  async createOpportunity(opportunity: InsertOpportunity): Promise<Opportunity> {
    const result = await db.insert(opportunities).values(opportunity).returning();
    return result[0];
  }

  async getAllOpportunities(): Promise<Opportunity[]> {
    return await db.select().from(opportunities);
  }

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

  // Analytics methods
  async getPipelineValueByDate(startDate?: string, endDate?: string): Promise<Array<{ date: Date; value: number }>> {
    let whereConditions = [
      sql`${snapshots.stage} NOT LIKE '%Closed%'`,
      sql`${snapshots.stage} NOT LIKE '%Validation%'`,
      sql`${snapshots.year1Value} > 0`
    ];

    // Add date range filters if provided
    if (startDate) {
      whereConditions.push(sql`${snapshots.snapshotDate} >= ${startDate}::date`);
    }
    if (endDate) {
      whereConditions.push(sql`${snapshots.snapshotDate} < (${endDate}::date + interval '1 day')`);
    }

    const result = await db
      .select({
        date: snapshots.snapshotDate,
        value: sql<number>`SUM(COALESCE(${snapshots.year1Value}, 0))`
      })
      .from(snapshots)
      .where(and(...whereConditions))
      .groupBy(snapshots.snapshotDate)
      .orderBy(snapshots.snapshotDate);
    
    return result.map(r => ({ date: r.date, value: Number(r.value) || 0 }));
  }

  async getStageDistribution(): Promise<Array<{ stage: string; count: number; value: number }>> {
    // Get the most recent snapshot date
    const latestDateResult = await db
      .select({ maxDate: sql<string>`MAX(${snapshots.snapshotDate})::date::text` })
      .from(snapshots);
    
    const latestDateStr = latestDateResult[0]?.maxDate;
    
    if (!latestDateStr) {
      return [];
    }
    
    console.log(`🗓️ Using latest snapshot date for stage distribution: ${latestDateStr}`);
    
    // Only count opportunities from the most recent snapshot date
    const result = await db
      .select({
        stage: snapshots.stage,
        count: sql<number>`COUNT(DISTINCT ${snapshots.opportunityId})`,
        value: sql<number>`SUM(COALESCE(${snapshots.tcv}, 0))`
      })
      .from(snapshots)
      .where(and(
        sql`${snapshots.stage} IS NOT NULL`,
        sql`${snapshots.stage} NOT LIKE '%Closed%'`,
        sql`${snapshots.stage} NOT LIKE '%Validation%'`,
        sql`${snapshots.snapshotDate}::date = ${latestDateStr}::date`
      ))
      .groupBy(snapshots.stage);
    
    return result.map(r => ({
      stage: r.stage || 'Unknown',
      count: Number(r.count) || 0,
      value: Number(r.value) || 0
    }));
  }

  async getYear1ArrDistribution(): Promise<Array<{ stage: string; count: number; value: number }>> {
    // Get the most recent snapshot date
    const latestDateResult = await db
      .select({ maxDate: sql<string>`MAX(${snapshots.snapshotDate})::date::text` })
      .from(snapshots);
    
    const latestDateStr = latestDateResult[0]?.maxDate;
    
    if (!latestDateStr) {
      return [];
    }
    
    console.log(`💰 Using latest snapshot date for Year 1 ARR distribution: ${latestDateStr}`);
    
    // Only count opportunities from the most recent snapshot date using year1_arr field
    const result = await db
      .select({
        stage: snapshots.stage,
        count: sql<number>`COUNT(DISTINCT ${snapshots.opportunityId})`,
        value: sql<number>`SUM(COALESCE(${snapshots.year1Value}, 0))`
      })
      .from(snapshots)
      .where(and(
        sql`${snapshots.stage} IS NOT NULL`,
        sql`${snapshots.stage} NOT LIKE '%Closed%'`,
        sql`${snapshots.stage} NOT LIKE '%Validation%'`,
        sql`${snapshots.snapshotDate}::date = ${latestDateStr}::date`
      ))
      .groupBy(snapshots.stage);
    
    return result.map(r => ({
      stage: r.stage || 'Unknown',
      count: Number(r.count) || 0,
      value: Number(r.value) || 0
    }));
  }

  async getFiscalYearPipeline(): Promise<Array<{ fiscalYear: string; value: number }>> {
    // Get the most recent snapshot date
    const latestDateResult = await db
      .select({ maxDate: sql<string>`MAX(${snapshots.snapshotDate})::date::text` })
      .from(snapshots);
    
    const latestDateStr = latestDateResult[0]?.maxDate;
    
    if (!latestDateStr) {
      return [];
    }
    
    console.log(`🗓️ Using latest snapshot date for fiscal year pipeline: ${latestDateStr}`);
    
    // Only use data from the most recent snapshot date
    // Calculate fiscal year: if month is Jan (1), use current year, otherwise use next year
    const result = await db
      .select({
        fiscalYear: sql<string>`CASE 
          WHEN EXTRACT(MONTH FROM ${snapshots.closeDate}) = 1 
          THEN EXTRACT(YEAR FROM ${snapshots.closeDate})::text
          ELSE (EXTRACT(YEAR FROM ${snapshots.closeDate}) + 1)::text
        END`,
        value: sql<number>`SUM(COALESCE(${snapshots.year1Value}, 0))`
      })
      .from(snapshots)
      .where(and(
        sql`${snapshots.stage} NOT LIKE '%Closed%'`,
        sql`${snapshots.stage} NOT LIKE '%Validation%'`,
        sql`${snapshots.snapshotDate}::date = ${latestDateStr}::date`,
        sql`${snapshots.closeDate} IS NOT NULL`
      ))
      .groupBy(sql`CASE 
        WHEN EXTRACT(MONTH FROM ${snapshots.closeDate}) = 1 
        THEN EXTRACT(YEAR FROM ${snapshots.closeDate})::text
        ELSE (EXTRACT(YEAR FROM ${snapshots.closeDate}) + 1)::text
      END`)
      .orderBy(sql`CASE 
        WHEN EXTRACT(MONTH FROM ${snapshots.closeDate}) = 1 
        THEN EXTRACT(YEAR FROM ${snapshots.closeDate})::text
        ELSE (EXTRACT(YEAR FROM ${snapshots.closeDate}) + 1)::text
      END`);
    
    return result.map(r => ({
      fiscalYear: r.fiscalYear || '',
      value: Number(r.value) || 0
    }));
  }

  async getFiscalQuarterPipeline(): Promise<Array<{ fiscalQuarter: string; value: number }>> {
    // Get the most recent snapshot date
    const latestDateResult = await db
      .select({ maxDate: sql<string>`MAX(${snapshots.snapshotDate})::date::text` })
      .from(snapshots);
    
    const latestDateStr = latestDateResult[0]?.maxDate;
    
    if (!latestDateStr) {
      return [];
    }
    
    console.log(`🗓️ Using latest snapshot date for fiscal quarter pipeline: ${latestDateStr}`);
    
    // Only use data from the most recent snapshot date, group by close date fiscal quarters
    // Fiscal quarters: Q1(Feb-Apr), Q2(May-Jul), Q3(Aug-Oct), Q4(Nov-Jan)
    const result = await db
      .select({
        fiscalQuarter: sql<string>`CONCAT(
          CASE 
            WHEN EXTRACT(MONTH FROM ${snapshots.closeDate}) = 1 
            THEN EXTRACT(YEAR FROM ${snapshots.closeDate})::text
            ELSE (EXTRACT(YEAR FROM ${snapshots.closeDate}) + 1)::text
          END, 
          ' Q', 
          CASE 
            WHEN EXTRACT(MONTH FROM ${snapshots.closeDate}) IN (2,3,4) THEN '1'
            WHEN EXTRACT(MONTH FROM ${snapshots.closeDate}) IN (5,6,7) THEN '2'
            WHEN EXTRACT(MONTH FROM ${snapshots.closeDate}) IN (8,9,10) THEN '3'
            WHEN EXTRACT(MONTH FROM ${snapshots.closeDate}) IN (11,12,1) THEN '4'
          END)`,
        value: sql<number>`SUM(COALESCE(${snapshots.year1Value}, 0))`
      })
      .from(snapshots)
      .where(and(
        sql`${snapshots.stage} NOT LIKE '%Closed%'`,
        sql`${snapshots.stage} NOT LIKE '%Validation%'`,
        sql`${snapshots.snapshotDate}::date = ${latestDateStr}::date`,
        sql`${snapshots.closeDate} IS NOT NULL`
      ))
      .groupBy(sql`CASE 
        WHEN EXTRACT(MONTH FROM ${snapshots.closeDate}) = 1 
        THEN EXTRACT(YEAR FROM ${snapshots.closeDate})::text
        ELSE (EXTRACT(YEAR FROM ${snapshots.closeDate}) + 1)::text
      END, CASE 
        WHEN EXTRACT(MONTH FROM ${snapshots.closeDate}) IN (2,3,4) THEN '1'
        WHEN EXTRACT(MONTH FROM ${snapshots.closeDate}) IN (5,6,7) THEN '2'
        WHEN EXTRACT(MONTH FROM ${snapshots.closeDate}) IN (8,9,10) THEN '3'
        WHEN EXTRACT(MONTH FROM ${snapshots.closeDate}) IN (11,12,1) THEN '4'
      END`)
      .orderBy(sql`CASE 
        WHEN EXTRACT(MONTH FROM ${snapshots.closeDate}) = 1 
        THEN EXTRACT(YEAR FROM ${snapshots.closeDate})::text
        ELSE (EXTRACT(YEAR FROM ${snapshots.closeDate}) + 1)::text
      END, CASE 
        WHEN EXTRACT(MONTH FROM ${snapshots.closeDate}) IN (2,3,4) THEN '1'
        WHEN EXTRACT(MONTH FROM ${snapshots.closeDate}) IN (5,6,7) THEN '2'
        WHEN EXTRACT(MONTH FROM ${snapshots.closeDate}) IN (8,9,10) THEN '3'
        WHEN EXTRACT(MONTH FROM ${snapshots.closeDate}) IN (11,12,1) THEN '4'
      END`);
    
    return result.map(r => ({
      fiscalQuarter: r.fiscalQuarter || '',
      value: Number(r.value) || 0
    }));
  }

  async getMonthlyPipeline(): Promise<Array<{ month: string; value: number }>> {
    // Get the most recent snapshot date
    const latestDateResult = await db
      .select({ maxDate: sql<string>`MAX(${snapshots.snapshotDate})::date::text` })
      .from(snapshots);
    
    const latestDateStr = latestDateResult[0]?.maxDate;
    
    if (!latestDateStr) {
      return [];
    }
    
    console.log(`🗓️ Using latest snapshot date for monthly pipeline: ${latestDateStr}`);
    
    // Only use data from the most recent snapshot date, group by close date months
    const result = await db
      .select({
        month: sql<string>`TO_CHAR(${snapshots.closeDate}, 'YYYY-MM')`,
        value: sql<number>`SUM(COALESCE(${snapshots.year1Value}, 0))`
      })
      .from(snapshots)
      .where(and(
        sql`${snapshots.stage} NOT LIKE '%Closed%'`,
        sql`${snapshots.stage} NOT LIKE '%Validation%'`,
        sql`${snapshots.snapshotDate}::date = ${latestDateStr}::date`,
        sql`${snapshots.closeDate} IS NOT NULL`
      ))
      .groupBy(sql`TO_CHAR(${snapshots.closeDate}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${snapshots.closeDate}, 'YYYY-MM')`);
    
    return result.map(r => ({
      month: r.month || '',
      value: Number(r.value) || 0
    }));
  }

  async getDealMovements(days: number): Promise<Array<{ 
    opportunityName: string; 
    from: string; 
    to: string; 
    date: Date; 
    value: number;
    opportunityId: string;
    clientName?: string;
  }>> {
    // Get date range for filtering
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // Get all snapshots within the date range, ordered by opportunity and date
    const allSnapshots = await db.select({
      id: snapshots.id,
      opportunityId: snapshots.opportunityId,
      snapshotDate: snapshots.snapshotDate,
      stage: snapshots.stage,
      year1Value: snapshots.year1Value,
      opportunityName: opportunities.name,
      opportunityIdString: opportunities.opportunityId,
      clientName: opportunities.clientName
    })
    .from(snapshots)
    .innerJoin(opportunities, eq(snapshots.opportunityId, opportunities.id))
    .where(gte(snapshots.snapshotDate, startDate))
    .orderBy(snapshots.opportunityId, snapshots.snapshotDate);

    // Group snapshots by opportunity
    const opportunitySnapshots = new Map<number, any[]>();
    
    for (const snapshot of allSnapshots) {
      const oppId = snapshot.opportunityId;
      if (oppId !== null) {
        if (!opportunitySnapshots.has(oppId)) {
          opportunitySnapshots.set(oppId, []);
        }
        opportunitySnapshots.get(oppId)!.push(snapshot);
      }
    }

    const movements: Array<{
      opportunityName: string;
      from: string;
      to: string;
      date: Date;
      value: number;
      opportunityId: string;
      clientName?: string;
    }> = [];

    // Detect stage changes for each opportunity
    opportunitySnapshots.forEach((opportunitySnapshotList, opportunityId) => {
      // Sort snapshots by date
      opportunitySnapshotList.sort((a: any, b: any) => new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime());
      
      // Find stage transitions
      for (let i = 1; i < opportunitySnapshotList.length; i++) {
        const previousSnapshot = opportunitySnapshotList[i - 1];
        const currentSnapshot = opportunitySnapshotList[i];
        
        // If stage changed, record the movement
        if (previousSnapshot.stage !== currentSnapshot.stage) {
          movements.push({
            opportunityName: currentSnapshot.opportunityName,
            from: previousSnapshot.stage,
            to: currentSnapshot.stage,
            date: new Date(currentSnapshot.snapshotDate),
            value: currentSnapshot.year1Value || 0,
            opportunityId: currentSnapshot.opportunityIdString,
            clientName: currentSnapshot.clientName
          });
        }
      }
    });

    console.log(`📊 Deal movements analysis: Found ${movements.length} stage transitions in last ${days} days`);
    if (movements.length > 0) {
      console.log('🔄 Sample movements:', movements.slice(0, 3));
    }

    return movements;
  }

  async getStageTimingData(startDate?: string, endDate?: string): Promise<Array<{ stage: string; avgDays: number; dealCount: number }>> {
    // Build where conditions for date filtering
    let whereConditions = [];
    if (startDate) {
      whereConditions.push(sql`${snapshots.snapshotDate} >= ${startDate}`);
    }
    if (endDate) {
      whereConditions.push(sql`${snapshots.snapshotDate} <= ${endDate}`);
    }

    // Get filtered snapshots and group by opportunity
    const allSnapshots = whereConditions.length > 0 
      ? await db.select().from(snapshots).where(and(...whereConditions)).orderBy(snapshots.snapshotDate)
      : await db.select().from(snapshots).orderBy(snapshots.snapshotDate);
    
    console.log(`🔍 Stage timing analysis: Found ${allSnapshots.length} total snapshots${startDate || endDate ? ` (filtered by date range)` : ''}`);
    
    // Group snapshots by opportunity
    const opportunitySnapshots = new Map<number, any[]>();
    
    for (const snapshot of allSnapshots) {
      if (snapshot.opportunityId) {
        if (!opportunitySnapshots.has(snapshot.opportunityId)) {
          opportunitySnapshots.set(snapshot.opportunityId, []);
        }
        opportunitySnapshots.get(snapshot.opportunityId)!.push(snapshot);
      }
    }

    // Track stage durations for actual stage transitions
    const stageTimings = new Map<string, { totalDays: number; count: number }>();

    console.log(`🔍 Stage timing analysis: Found ${opportunitySnapshots.size} opportunities with snapshots`);
    
    let opportunitiesProcessed = 0;
    let stageTransitionsFound = 0;
    
    const opportunityEntries = Array.from(opportunitySnapshots.entries());
    for (const [opportunityId, oppSnapshots] of opportunityEntries) {
      // Only consider opportunities with multiple snapshots to track transitions
      if (oppSnapshots.length < 2) continue;
      
      opportunitiesProcessed++;

      // Sort snapshots by date for this opportunity
      const sortedSnapshots = oppSnapshots.sort((a: any, b: any) => 
        new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
      );

      // Track stage transitions - only count time when stage actually changes
      let currentStage: string | null = null;
      let currentStageStart: Date | null = null;

      for (const snapshot of sortedSnapshots) {
        const snapshotDate = new Date(snapshot.snapshotDate);

        if (!snapshot.stage) continue;

        // Only track when stage actually changes (not just different snapshot dates)
        if (currentStage !== snapshot.stage) {
          // If we were tracking a previous stage and this is a real stage change, record its duration
          if (currentStage && currentStageStart && currentStage !== snapshot.stage) {
            const daysInStage = (snapshotDate.getTime() - currentStageStart.getTime()) / (1000 * 60 * 60 * 24);
            
            if (daysInStage > 0) {
              if (!stageTimings.has(currentStage)) {
                stageTimings.set(currentStage, { totalDays: 0, count: 0 });
              }
              const timing = stageTimings.get(currentStage)!;
              timing.totalDays += daysInStage;
              timing.count += 1;
              stageTransitionsFound++;
            }
          }

          // Start tracking the new stage
          currentStage = snapshot.stage;
          currentStageStart = snapshotDate;
        }
        // If stage is the same, just update the current stage start to the earliest date for this stage
        else if (currentStage === snapshot.stage && currentStageStart && snapshotDate < currentStageStart) {
          currentStageStart = snapshotDate;
        }
      }
    }

    console.log(`🔍 Stage timing analysis: Processed ${opportunitiesProcessed} opportunities, found ${stageTransitionsFound} stage transitions`);
    console.log(`🔍 Stage timing analysis: Found timing data for ${stageTimings.size} stages`);
    
    // Calculate averages and format results
    const results = Array.from(stageTimings.entries())
      .map(([stage, timing]) => ({
        stage,
        avgDays: Math.round((timing.totalDays / timing.count) * 10) / 10, // Round to 1 decimal
        dealCount: timing.count
      }))
      .filter(item => item.avgDays > 0); // Only include stages with positive duration

    // Order stages according to sales pipeline sequence
    const stageOrder = [
      'Validation/Introduction',
      'Discover', 
      'Developing Champions',
      'ROI Analysis/Pricing',
      'Negotiation/Review'
    ];

    // Sort results by pipeline order
    console.log(`🔍 Available stages: ${results.map(r => r.stage).join(', ')}`);
    
    const orderedResults = stageOrder
      .map(stageName => results.find(r => r.stage === stageName))
      .filter(Boolean) as Array<{ stage: string; avgDays: number; dealCount: number }>;

    // Add any stages not in the predefined order at the end
    const remainingResults = results.filter(r => !stageOrder.includes(r.stage));
    
    console.log(`🔍 Ordered stages: ${orderedResults.map(r => r.stage).join(', ')}`);
    console.log(`🔍 Remaining stages: ${remainingResults.map(r => r.stage).join(', ')}`);
    
    const finalResults = [...orderedResults, ...remainingResults];
    
    // Calculate total expected days to close
    const totalDays = finalResults.reduce((sum, stage) => sum + stage.avgDays, 0);
    console.log(`🔍 Stage timing analysis: Total expected days to close: ${Math.round(totalDays * 10) / 10} days`);
    
    return finalResults;
  }



  async getDateSlippageData(): Promise<Array<{ 
    stageName: string;
    avgSlippageDays: number;
    dealCount: number;
    quarterEndSlippageRate: number;
    totalSlippedValue: number;
    worstCase: {
      opportunityName: string;
      slippageDays: number;
      value: number;
    } | null;
  }>> {
    return [];
  }

  async getValidationAnalysis(): Promise<{
    totalValidationValue: number;
    totalValidationCount: number;
    avgValidationDealSize: number;
    conversionToLaterStage: number;
    conversionToClosedLost: number;
    conversionRate: number;
    stageBreakdown: Array<{
      fromStage: string;
      toLaterStage: number;
      toClosedLost: number;
      totalDeals: number;
      conversionRate: number;
    }>;
    topValidationOpportunities: Array<{
      opportunityName: string;
      clientName?: string;
      value: number;
      daysInValidation: number;
      stage: string;
    }>;
  }> {
    return {
      totalValidationValue: 0,
      totalValidationCount: 0,
      avgValidationDealSize: 0,
      conversionToLaterStage: 0,
      conversionToClosedLost: 0,
      conversionRate: 0,
      stageBreakdown: [],
      topValidationOpportunities: []
    };
  }

  async getClosingProbabilityData(startDate?: string, endDate?: string): Promise<Array<{
    stage: string;
    totalDeals: number;
    closedWon: number;
    closedLost: number;
    winRate: number;
    conversionToNext: number;
  }>> {
    // Get all snapshots and process them in memory to avoid complex SQL array operations
    const allSnapshots = await db.select().from(snapshots);

    // Filter closed snapshots - use same logic as analytics function
    const closedSnapshots = allSnapshots.filter(snapshot => {
      if (!snapshot.stage) return false;
      const stage = snapshot.stage.toLowerCase();
      return stage.includes('closed') || stage.includes('won') || stage.includes('lost');
    });

    if (closedSnapshots.length === 0) {
      return [];
    }

    console.log('🎯 Date range filter:', startDate, 'to', endDate);
    console.log('🎯 Total closed snapshots found:', closedSnapshots.length);

    // Get final outcomes for each opportunity with date filtering
    const dealOutcomes = new Map<number, { stage: string; closeDate: Date }>();
    for (const snapshot of closedSnapshots) {
      if (snapshot.opportunityId !== null && snapshot.stage !== null) {
        const existing = dealOutcomes.get(snapshot.opportunityId);
        // Use expectedCloseDate if available, otherwise fall back to snapshotDate
        const closeDate = snapshot.expectedCloseDate || snapshot.snapshotDate;
        
        // Keep the latest close date for each opportunity
        if (!existing || closeDate > existing.closeDate) {
          dealOutcomes.set(snapshot.opportunityId, {
            stage: snapshot.stage,
            closeDate: closeDate
          });
        }
      }
    }

    // Apply date range filtering to closed deals if provided
    let filteredDealOutcomes = dealOutcomes;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      filteredDealOutcomes = new Map();
      
      for (const [opportunityId, outcome] of Array.from(dealOutcomes.entries())) {
        if (outcome.closeDate >= start && outcome.closeDate <= end) {
          filteredDealOutcomes.set(opportunityId, outcome);
        }
      }

    }

    console.log('🎯 Total deals after filtering:', filteredDealOutcomes.size);
    console.log('🎯 Won deals in filtered range:', Array.from(filteredDealOutcomes.values()).filter(outcome => outcome.stage.toLowerCase().includes('won')).length);
    console.log('🎯 Lost deals in filtered range:', Array.from(filteredDealOutcomes.values()).filter(outcome => outcome.stage.toLowerCase().includes('lost')).length);

    // Get filtered closed opportunity IDs
    const closedOpportunityIds = new Set(filteredDealOutcomes.keys());

    // Filter all snapshots for deals that eventually closed in the date range
    const relevantSnapshots = allSnapshots.filter(s => 
      s.opportunityId !== null && closedOpportunityIds.has(s.opportunityId)
    ).sort((a, b) => a.snapshotDate.getTime() - b.snapshotDate.getTime());

    // Define stage order for analysis
    const stages = [
      'Validation/Introduction',
      'Discover',
      'Developing Champions', 
      'ROI Analysis/Pricing',
      'Negotiation/Review'
    ];

    // Initialize stage analysis
    const stageAnalysis = new Map<string, {
      deals: Set<number>;
      won: Set<number>;
      lost: Set<number>;
    }>();

    for (const stage of stages) {
      stageAnalysis.set(stage, {
        deals: new Set(),
        won: new Set(),
        lost: new Set()
      });
    }

    // Analyze each deal's journey
    filteredDealOutcomes.forEach((finalOutcome, opportunityId) => {
      const dealSnapshots = relevantSnapshots
        .filter(s => s.opportunityId === opportunityId)
        .sort((a, b) => a.snapshotDate.getTime() - b.snapshotDate.getTime());

      // Track which stages this deal passed through
      const stagesVisited = new Set<string>();
      for (const snapshot of dealSnapshots) {
        if (snapshot.stage && stages.includes(snapshot.stage)) {
          stagesVisited.add(snapshot.stage);
        }
      }

      // For each stage the deal visited, record the outcome
      stagesVisited.forEach(visitedStage => {
        const analysis = stageAnalysis.get(visitedStage);
        if (analysis) {
          analysis.deals.add(opportunityId);
          const finalStage = finalOutcome.stage.toLowerCase();
          if (finalStage.includes('closed won') || finalStage.includes('won')) {
            analysis.won.add(opportunityId);
          } else {
            analysis.lost.add(opportunityId);
          }
        }
      });
    });

    // Calculate probabilities
    const results = [];
    for (const stage of stages) {
      const analysis = stageAnalysis.get(stage);
      if (analysis && analysis.deals.size > 0) {
        const totalDeals = analysis.deals.size;
        const closedWon = analysis.won.size;
        const closedLost = analysis.lost.size;
        const winRate = (closedWon / totalDeals) * 100;

        console.log(`🎯 Stage "${stage}": ${totalDeals} deals (${closedWon} won, ${closedLost} lost)`);
        
        // Get deal details for this stage
        const stageDeals = Array.from(analysis.deals).map(dealId => {
          const dealOutcome = filteredDealOutcomes.get(dealId);
          const dealSnapshots = relevantSnapshots.filter(s => s.opportunityId === dealId);
          const latestSnapshot = dealSnapshots.sort((a, b) => new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime())[0];
          
          return {
            opportunityName: latestSnapshot?.opportunityName || 'Unknown',
            clientName: latestSnapshot?.accountName || undefined,
            finalStage: dealOutcome?.stage || 'Unknown',
            closeDate: dealOutcome?.closeDate.toISOString().split('T')[0] || '',
            value: latestSnapshot?.amount || 0
          };
        });
        
        results.push({
          stage,
          totalDeals,
          closedWon,
          closedLost,
          winRate,
          conversionToNext: winRate, // Using win rate as conversion for now
          deals: stageDeals
        });
      }
    }

    return results;
  }

  async getDuplicateOpportunities(endDate?: string): Promise<Array<{
    clientName: string;
    opportunities: Array<{
      id: number;
      name: string;
      opportunityId: string;
      owner?: string;
      isActive?: boolean;
      closeDate?: Date;
      latestSnapshot?: {
        stage: string;
        amount: number;
      };
    }>;
    totalValue: number;
    totalOpportunitiesCount: number;
    activeOpportunitiesCount: number;
  }>> {
    let targetDate = new Date();
    if (endDate) {
      targetDate = new Date(endDate);
    }

    console.log(`🔍 Starting duplicate opportunities analysis for date: ${targetDate.toISOString().split('T')[0]}`);

    // Get the latest snapshot date at or before the target date
    const latestDateResult = await db.execute(sql`
      SELECT MAX(snapshot_date) as latest_date
      FROM snapshots
      WHERE snapshot_date <= ${targetDate.toISOString()}
    `);

    const latestDate = (latestDateResult.rows[0] as any)?.latest_date;
    if (!latestDate) {
      console.log(`🔍 No snapshots found before ${targetDate.toISOString()}`);
      return [];
    }

    // Get all opportunities with their latest snapshots for accounts with multiple opportunities
    const result = await db.execute(sql`
      WITH account_opportunity_counts AS (
        SELECT 
          s.account_name,
          COUNT(DISTINCT s.opportunity_id) as total_opportunities,
          COUNT(DISTINCT CASE WHEN s.stage NOT ILIKE '%closed%' AND s.stage NOT ILIKE '%validation%' THEN s.opportunity_id END) as active_opportunities
        FROM snapshots s
        WHERE s.snapshot_date = ${latestDate}
        AND s.account_name IS NOT NULL 
        AND s.account_name != ''
        GROUP BY s.account_name
        HAVING COUNT(DISTINCT s.opportunity_id) > 1
        AND COUNT(DISTINCT CASE WHEN s.stage NOT ILIKE '%closed%' AND s.stage NOT ILIKE '%validation%' THEN s.opportunity_id END) > 0
      ),
      opportunity_details AS (
        SELECT 
          s.account_name as client_name,
          o.id,
          o.opportunity_id,
          s.opportunity_name as name,
          s.stage,
          s.amount,
          s.close_date,
          ROW_NUMBER() OVER (PARTITION BY s.opportunity_id ORDER BY s.snapshot_date DESC) as rn
        FROM snapshots s
        JOIN opportunities o ON s.opportunity_id = o.id
        JOIN account_opportunity_counts aoc ON s.account_name = aoc.account_name
        WHERE s.snapshot_date = ${latestDate}
      )
      SELECT 
        client_name,
        id,
        opportunity_id,
        name,
        stage,
        amount,
        close_date
      FROM opportunity_details
      WHERE rn = 1
      ORDER BY client_name, amount DESC
    `);

    // Group by client name
    const clientGroups = new Map<string, Array<{
      id: number;
      name: string;
      opportunityId: string;
      owner?: string;
      isActive?: boolean;
      closeDate?: Date;
      latestSnapshot?: {
        stage: string;
        amount: number;
      };
    }>>();

    for (const row of result.rows) {
      const data = row as any;
      const clientName = data.client_name;
      
      if (!clientGroups.has(clientName)) {
        clientGroups.set(clientName, []);
      }

      const stage = (data.stage || '').toLowerCase();
      const isActive = !stage.includes('closed') && !stage.includes('validation');
      
      clientGroups.get(clientName)!.push({
        id: Number(data.id),
        name: data.name || 'Unknown',
        opportunityId: data.opportunity_id,
        owner: undefined, // Could add this from opportunities table if needed
        isActive,
        closeDate: data.close_date ? new Date(data.close_date) : undefined,
        latestSnapshot: {
          stage: data.stage || 'Unknown',
          amount: Number(data.amount) || 0
        }
      } as any);
    }

    // Convert to the expected format
    const duplicateGroups = Array.from(clientGroups.entries()).map(([clientName, opportunities]) => {
      const activeOpportunities = opportunities.filter(opp => {
        const stage = opp.latestSnapshot?.stage?.toLowerCase() || '';
        return !stage.includes('closed') && !stage.includes('validation');
      });

      return {
        clientName,
        opportunities,
        totalValue: activeOpportunities.reduce((sum, opp) => sum + (opp.latestSnapshot?.amount || 0), 0),
        totalOpportunitiesCount: opportunities.length,
        activeOpportunitiesCount: activeOpportunities.length
      };
    })
    .filter(group => group.activeOpportunitiesCount > 0) // Only include groups with at least one active opportunity
    .sort((a, b) => b.totalValue - a.totalValue);

    console.log(`🔍 Duplicate analysis complete: ${duplicateGroups.length} duplicate groups found`);
    return duplicateGroups;
  }

  // Settings methods
  async getStageMappings(): Promise<Array<{ from: string; to: string }>> {
    return this.stageMappings;
  }

  async setStageMappings(mappings: Array<{ from: string; to: string }>): Promise<void> {
    this.stageMappings = mappings;
  }

  async getProbabilityConfigs(): Promise<Array<{ stage: string; confidence: string; probability: number }>> {
    return this.probabilityConfigs;
  }

  async setProbabilityConfigs(configs: Array<{ stage: string; confidence: string; probability: number }>): Promise<void> {
    this.probabilityConfigs = configs;
  }

  // Data management methods
  async clearAllData(): Promise<void> {
    await db.delete(snapshots);
    await db.delete(opportunities);
    await db.delete(uploadedFiles);
  }

  async clearDataByDate(snapshotDate: Date): Promise<void> {
    // Get the start and end of the day for the snapshot date
    const startOfDay = new Date(snapshotDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(snapshotDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Delete snapshots for this specific date
    await db.delete(snapshots).where(
      and(
        gte(snapshots.snapshotDate, startOfDay),
        lte(snapshots.snapshotDate, endOfDay)
      )
    );

    console.log(`🗑️ Cleared all data for date: ${snapshotDate.toISOString().split('T')[0]}`);
  }

  // Sales-specific methods that extend existing functionality with sales rep filtering
  async getSalesRepsList(): Promise<Array<{ owner: string; count: number }>> {
    const result = await db
      .select({
        owner: opportunities.owner,
        count: sql<number>`COUNT(*)`
      })
      .from(opportunities)
      .where(sql`${opportunities.owner} IS NOT NULL AND ${opportunities.owner} != ''`)
      .groupBy(opportunities.owner)
      .orderBy(sql`COUNT(*) DESC`);
    
    return result.map(r => ({ owner: r.owner || '', count: Number(r.count) || 0 }));
  }

  async getClientsList(): Promise<Array<{ clientName: string; count: number }>> {
    const result = await db
      .select({
        clientName: opportunities.clientName,
        count: sql<number>`COUNT(*)`
      })
      .from(opportunities)
      .where(sql`${opportunities.clientName} IS NOT NULL AND ${opportunities.clientName} != ''`)
      .groupBy(opportunities.clientName)
      .orderBy(sql`COUNT(*) DESC`);
    
    return result.map(r => ({ clientName: r.clientName || '', count: Number(r.count) || 0 }));
  }

  // Sales-specific analytics methods (based on original pipeline methods with sales rep filtering)
  async getSalesPipelineValueByDate(filters: any): Promise<Array<{ date: Date; value: number }>> {
    // Use the same logic as the original getPipelineValueByDate but with sales rep filtering
    let whereConditions = [
      sql`${snapshots.stage} NOT LIKE '%Closed%'`,
      sql`${snapshots.stage} NOT LIKE '%Validation%'`,
      sql`${snapshots.year1Value} > 0`
    ];

    // Add sales rep filter if specified
    if (filters.salesRep && filters.salesRep !== 'all') {
      whereConditions.push(eq(opportunities.owner, filters.salesRep));
    }

    // Add date range filters if provided (same as original)
    if (filters.startDate) {
      whereConditions.push(sql`${snapshots.snapshotDate} >= ${filters.startDate}::date`);
    }
    if (filters.endDate) {
      whereConditions.push(sql`${snapshots.snapshotDate} < (${filters.endDate}::date + interval '1 day')`);
    }

    const result = await db
      .select({
        date: snapshots.snapshotDate,
        value: sql<number>`SUM(COALESCE(${snapshots.year1Value}, 0))`
      })
      .from(snapshots)
      .innerJoin(opportunities, eq(snapshots.opportunityId, opportunities.id))
      .where(and(...whereConditions))
      .groupBy(snapshots.snapshotDate)
      .orderBy(snapshots.snapshotDate);
    
    return result.map(r => ({ date: r.date, value: Number(r.value) || 0 }));
  }

  async getSalesStageDistribution(filters: any): Promise<Array<{ stage: string; count: number; value: number }>> {
    // Use the same logic as the original getStageDistribution but with sales rep filtering
    // Get the most recent snapshot date
    const latestDateResult = await db
      .select({ maxDate: sql<string>`MAX(${snapshots.snapshotDate})::date::text` })
      .from(snapshots);
    
    const latestDateStr = latestDateResult[0]?.maxDate;
    
    if (!latestDateStr) {
      return [];
    }
    
    console.log(`🗓️ Using latest snapshot date for sales stage distribution: ${latestDateStr}`);
    
    let whereConditions = [
      sql`${snapshots.stage} IS NOT NULL`,
      sql`${snapshots.stage} NOT LIKE '%Closed%'`,
      sql`${snapshots.stage} NOT LIKE '%Validation%'`,
      sql`${snapshots.snapshotDate}::date = ${latestDateStr}::date`
    ];

    // Add sales rep filter if specified
    if (filters.salesRep && filters.salesRep !== 'all') {
      whereConditions.push(eq(opportunities.owner, filters.salesRep));
    }

    // Only count opportunities from the most recent snapshot date
    const result = await db
      .select({
        stage: snapshots.stage,
        count: sql<number>`COUNT(DISTINCT ${snapshots.opportunityId})`,
        value: sql<number>`SUM(COALESCE(${snapshots.tcv}, 0))`
      })
      .from(snapshots)
      .innerJoin(opportunities, eq(snapshots.opportunityId, opportunities.id))
      .where(and(...whereConditions))
      .groupBy(snapshots.stage);
    
    return result.map(r => ({
      stage: r.stage || 'Unknown',
      count: Number(r.count) || 0,
      value: Number(r.value) || 0
    }));
  }

  async getSalesFiscalYearPipeline(filters: any): Promise<Array<{ fiscalYear: string; value: number }>> {
    let whereConditions = [
      sql`${snapshots.stage} NOT LIKE '%Closed%'`,
      sql`${snapshots.year1Value} > 0`
    ];

    if (filters.salesRep && filters.salesRep !== 'all') {
      whereConditions.push(eq(opportunities.owner, filters.salesRep));
    }

    const result = await db
      .select({
        fiscalYear: sql<string>`
          CASE 
            WHEN EXTRACT(MONTH FROM ${snapshots.snapshotDate}) >= 2 
            THEN 'FY' || EXTRACT(YEAR FROM ${snapshots.snapshotDate} + INTERVAL '1 year')
            ELSE 'FY' || EXTRACT(YEAR FROM ${snapshots.snapshotDate})
          END
        `,
        value: sql<number>`SUM(COALESCE(${snapshots.year1Value}, 0))`
      })
      .from(snapshots)
      .innerJoin(opportunities, eq(snapshots.opportunityId, opportunities.id))
      .where(and(...whereConditions))
      .groupBy(sql`
        CASE 
          WHEN EXTRACT(MONTH FROM ${snapshots.snapshotDate}) >= 2 
          THEN 'FY' || EXTRACT(YEAR FROM ${snapshots.snapshotDate} + INTERVAL '1 year')
          ELSE 'FY' || EXTRACT(YEAR FROM ${snapshots.snapshotDate})
        END
      `)
      .orderBy(sql`
        CASE 
          WHEN EXTRACT(MONTH FROM ${snapshots.snapshotDate}) >= 2 
          THEN 'FY' || EXTRACT(YEAR FROM ${snapshots.snapshotDate} + INTERVAL '1 year')
          ELSE 'FY' || EXTRACT(YEAR FROM ${snapshots.snapshotDate})
        END
      `);
    
    return result.map(r => ({ 
      fiscalYear: r.fiscalYear, 
      value: Number(r.value) || 0 
    }));
  }

  async getSalesFiscalQuarterPipeline(filters: any): Promise<Array<{ fiscalQuarter: string; value: number }>> {
    // Use the same logic as the original getFiscalQuarterPipeline but with sales rep filtering
    // Get the most recent snapshot date
    const latestDateResult = await db
      .select({ maxDate: sql<string>`MAX(${snapshots.snapshotDate})::date::text` })
      .from(snapshots);
    
    const latestDateStr = latestDateResult[0]?.maxDate;
    
    if (!latestDateStr) {
      return [];
    }
    
    console.log(`🗓️ Using latest snapshot date for sales fiscal quarter pipeline: ${latestDateStr}`);
    
    let whereConditions = [
      sql`${snapshots.stage} NOT LIKE '%Closed%'`,
      sql`${snapshots.stage} NOT LIKE '%Validation%'`,
      sql`${snapshots.snapshotDate}::date = ${latestDateStr}::date`,
      sql`${snapshots.closeDate} IS NOT NULL`
    ];

    // Add sales rep filter if specified
    if (filters.salesRep && filters.salesRep !== 'all') {
      whereConditions.push(eq(opportunities.owner, filters.salesRep));
    }

    const result = await db
      .select({
        fiscalQuarter: sql<string>`
          CASE 
            WHEN EXTRACT(MONTH FROM ${snapshots.snapshotDate}) IN (2, 3, 4) THEN 'Q1 FY' || EXTRACT(YEAR FROM ${snapshots.snapshotDate} + INTERVAL '1 year')
            WHEN EXTRACT(MONTH FROM ${snapshots.snapshotDate}) IN (5, 6, 7) THEN 'Q2 FY' || EXTRACT(YEAR FROM ${snapshots.snapshotDate} + INTERVAL '1 year')
            WHEN EXTRACT(MONTH FROM ${snapshots.snapshotDate}) IN (8, 9, 10) THEN 'Q3 FY' || EXTRACT(YEAR FROM ${snapshots.snapshotDate} + INTERVAL '1 year')
            WHEN EXTRACT(MONTH FROM ${snapshots.snapshotDate}) IN (11, 12, 1) THEN 'Q4 FY' || 
              CASE 
                WHEN EXTRACT(MONTH FROM ${snapshots.snapshotDate}) IN (11, 12) THEN EXTRACT(YEAR FROM ${snapshots.snapshotDate} + INTERVAL '1 year')
                ELSE EXTRACT(YEAR FROM ${snapshots.snapshotDate})
              END
            ELSE 'Unknown'
          END
        `,
        value: sql<number>`SUM(COALESCE(${snapshots.year1Value}, 0))`
      })
      .from(snapshots)
      .innerJoin(opportunities, eq(snapshots.opportunityId, opportunities.id))
      .where(and(...whereConditions))
      .groupBy(sql`
        CASE 
          WHEN EXTRACT(MONTH FROM ${snapshots.snapshotDate}) IN (2, 3, 4) THEN 'Q1 FY' || EXTRACT(YEAR FROM ${snapshots.snapshotDate} + INTERVAL '1 year')
          WHEN EXTRACT(MONTH FROM ${snapshots.snapshotDate}) IN (5, 6, 7) THEN 'Q2 FY' || EXTRACT(YEAR FROM ${snapshots.snapshotDate} + INTERVAL '1 year')
          WHEN EXTRACT(MONTH FROM ${snapshots.snapshotDate}) IN (8, 9, 10) THEN 'Q3 FY' || EXTRACT(YEAR FROM ${snapshots.snapshotDate} + INTERVAL '1 year')
          WHEN EXTRACT(MONTH FROM ${snapshots.snapshotDate}) IN (11, 12, 1) THEN 'Q4 FY' || 
            CASE 
              WHEN EXTRACT(MONTH FROM ${snapshots.snapshotDate}) IN (11, 12) THEN EXTRACT(YEAR FROM ${snapshots.snapshotDate} + INTERVAL '1 year')
              ELSE EXTRACT(YEAR FROM ${snapshots.snapshotDate})
            END
          ELSE 'Unknown'
        END
      `)
      .orderBy(sql`
        CASE 
          WHEN EXTRACT(MONTH FROM ${snapshots.snapshotDate}) IN (2, 3, 4) THEN 'Q1 FY' || EXTRACT(YEAR FROM ${snapshots.snapshotDate} + INTERVAL '1 year')
          WHEN EXTRACT(MONTH FROM ${snapshots.snapshotDate}) IN (5, 6, 7) THEN 'Q2 FY' || EXTRACT(YEAR FROM ${snapshots.snapshotDate} + INTERVAL '1 year')
          WHEN EXTRACT(MONTH FROM ${snapshots.snapshotDate}) IN (8, 9, 10) THEN 'Q3 FY' || EXTRACT(YEAR FROM ${snapshots.snapshotDate} + INTERVAL '1 year')
          WHEN EXTRACT(MONTH FROM ${snapshots.snapshotDate}) IN (11, 12, 1) THEN 'Q4 FY' || 
            CASE 
              WHEN EXTRACT(MONTH FROM ${snapshots.snapshotDate}) IN (11, 12) THEN EXTRACT(YEAR FROM ${snapshots.snapshotDate} + INTERVAL '1 year')
              ELSE EXTRACT(YEAR FROM ${snapshots.snapshotDate})
            END
          ELSE 'Unknown'
        END
      `);
    
    return result.map(r => ({ 
      fiscalQuarter: r.fiscalQuarter, 
      value: Number(r.value) || 0 
    }));
  }

  async getSalesMonthlyPipeline(filters: any): Promise<Array<{ month: string; value: number }>> {
    // Use the same logic as the original getMonthlyPipeline but with sales rep filtering
    // Get the most recent snapshot date
    const latestDateResult = await db
      .select({ maxDate: sql<string>`MAX(${snapshots.snapshotDate})::date::text` })
      .from(snapshots);
    
    const latestDateStr = latestDateResult[0]?.maxDate;
    
    if (!latestDateStr) {
      return [];
    }
    
    console.log(`🗓️ Using latest snapshot date for sales monthly pipeline: ${latestDateStr}`);
    
    let whereConditions = [
      sql`${snapshots.stage} NOT LIKE '%Closed%'`,
      sql`${snapshots.stage} NOT LIKE '%Validation%'`,
      sql`${snapshots.snapshotDate}::date = ${latestDateStr}::date`,
      sql`${snapshots.closeDate} IS NOT NULL`
    ];

    // Add sales rep filter if specified
    if (filters.salesRep && filters.salesRep !== 'all') {
      whereConditions.push(eq(opportunities.owner, filters.salesRep));
    }

    // Group by expected close date month, not snapshot date
    const result = await db
      .select({
        month: sql<string>`TO_CHAR(${snapshots.closeDate}, 'Mon YYYY')`,
        value: sql<number>`SUM(COALESCE(${snapshots.year1Value}, 0))`
      })
      .from(snapshots)
      .innerJoin(opportunities, eq(snapshots.opportunityId, opportunities.id))
      .where(and(...whereConditions))
      .groupBy(sql`TO_CHAR(${snapshots.closeDate}, 'Mon YYYY')`)
      .orderBy(sql`TO_CHAR(${snapshots.closeDate}, 'Mon YYYY')`);
    
    return result.map(r => ({ 
      month: r.month, 
      value: Number(r.value) || 0 
    }));
  }

  // Placeholder methods for additional sales analytics
  async getSalesStageTimingData(filters: any): Promise<Array<{ stage: string; avgDays: number; dealCount: number }>> {
    return this.getStageTimingData(); // Use existing method for now
  }

  async getSalesDateSlippageData(filters: any): Promise<Array<any>> {
    return this.getDateSlippageData(); // Use existing method for now
  }

  async getSalesDuplicateOpportunities(filters: any): Promise<Array<any>> {
    const endDate = new Date().toISOString().split('T')[0];
    return this.getDuplicateOpportunities(endDate); // Use existing method for now
  }

  async getSalesValueChanges(filters: any): Promise<Array<any>> {
    return []; // Placeholder - would implement value change tracking
  }

  async getSalesClosingProbabilityData(filters: any): Promise<Array<any>> {
    return this.getClosingProbabilityData(); // Use existing method for now
  }

  async getSalesStageFunnel(filters: any): Promise<Array<any>> {
    // Create a basic stage funnel from stage distribution
    const stageDistribution = await this.getSalesStageDistribution(filters);
    return stageDistribution.map(stage => ({
      stage: stage.stage,
      count: stage.count,
      value: stage.value,
      avgValue: stage.count > 0 ? stage.value / stage.count : 0
    }));
  }

  async getSalesWinRateAnalysis(filters: any): Promise<any> {
    return { overall: { winRate: 0.3, totalDeals: 100, wonDeals: 30, lostDeals: 70 } }; // Placeholder
  }

  async getSalesCloseRateAnalysis(filters: any): Promise<any> {
    return { overall: { closeRate: 0.25, totalOpportunities: 200, closedDeals: 50, avgDaysToClose: 90 } }; // Placeholder
  }

  async getSalesLossReasons(filters: any): Promise<Array<any>> {
    return this.getLossReasonAnalysis(); // Use existing method for now
  }

  async getSalesOpportunities(filters: any): Promise<Array<any>> {
    // Use similar logic to the original opportunities endpoint but with sales rep filtering
    let whereConditions = [];

    if (filters.salesRep && filters.salesRep !== 'all') {
      whereConditions.push(eq(opportunities.owner, filters.salesRep));
    }

    if (filters.search) {
      whereConditions.push(like(opportunities.name, `%${filters.search}%`));
    }

    if (filters.clientName && filters.clientName !== 'all') {
      whereConditions.push(eq(opportunities.clientName, filters.clientName));
    }

    // Get opportunities with their latest snapshots (same pattern as original)
    const result = await db
      .select({
        id: opportunities.id,
        name: opportunities.name,
        clientName: opportunities.clientName,
        owner: opportunities.owner,
        createdDate: opportunities.createdDate,
        // Latest snapshot data
        latestStage: sql<string>`(
          SELECT stage FROM ${snapshots} 
          WHERE ${snapshots.opportunityId} = ${opportunities.id} 
          ORDER BY ${snapshots.snapshotDate} DESC 
          LIMIT 1
        )`,
        latestAmount: sql<number>`(
          SELECT year1_value FROM ${snapshots} 
          WHERE ${snapshots.opportunityId} = ${opportunities.id} 
          ORDER BY ${snapshots.snapshotDate} DESC 
          LIMIT 1
        )`,
        latestSnapshotDate: sql<Date>`(
          SELECT snapshot_date FROM ${snapshots} 
          WHERE ${snapshots.opportunityId} = ${opportunities.id} 
          ORDER BY ${snapshots.snapshotDate} DESC 
          LIMIT 1
        )`
      })
      .from(opportunities)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(opportunities.name);

    return result.map(r => ({
      id: r.id,
      name: r.name,
      clientName: r.clientName,
      owner: r.owner,
      createdDate: r.createdDate,
      latestSnapshot: {
        stage: r.latestStage,
        amount: Number(r.latestAmount) || 0,
        snapshotDate: r.latestSnapshotDate
      }
    }));
  }

  async getSalesStageFlow(filters: any): Promise<any> {
    return { stageFlow: [], flowSummary: null }; // Placeholder
  }

  async getSalesLossAnalysis(filters: any): Promise<any> {
    return { lossByStage: [], lossInsights: [] }; // Placeholder
  }

  async getSalesRecentLosses(filters: any): Promise<Array<any>> {
    return []; // Placeholder
  }

  async getStageSlippageAnalysis(startDate?: Date, endDate?: Date): Promise<Array<{
    stageName: string;
    avgSlippageDays: number;
    opportunityCount: number;
    totalSlippageDays: number;
  }>> {
    console.log('🔍 Starting stage slippage analysis...');
    
    try {
      // Get all snapshots ordered by opportunity and snapshot date
      let whereConditions = [
        sql`${snapshots.expectedCloseDate} IS NOT NULL`,
        sql`${snapshots.stage} IS NOT NULL`,
        sql`${snapshots.stage} NOT LIKE '%Closed%'`
      ];

      // Apply date filters if provided
      if (startDate) whereConditions.push(sql`${snapshots.snapshotDate} >= ${startDate}`);
      if (endDate) whereConditions.push(sql`${snapshots.snapshotDate} <= ${endDate}`);

      const allSnapshots = await db
        .select({
          opportunityId: snapshots.opportunityId,
          snapshotDate: snapshots.snapshotDate,
          stage: snapshots.stage,
          expectedCloseDate: snapshots.expectedCloseDate,
        })
        .from(snapshots)
        .where(and(...whereConditions))
        .orderBy(snapshots.opportunityId, snapshots.snapshotDate);

      console.log(`📊 Found ${allSnapshots.length} snapshots for slippage analysis`);

      if (allSnapshots.length === 0) {
        return [];
      }

      // Group snapshots by opportunity
      const opportunityGroups = new Map<number, any[]>();
      for (const snapshot of allSnapshots) {
        const oppId = snapshot.opportunityId;
        if (oppId === null) continue;
        if (!opportunityGroups.has(oppId)) {
          opportunityGroups.set(oppId, []);
        }
        opportunityGroups.get(oppId)!.push(snapshot);
      }

      // Calculate slippage for each stage transition
      const stageSlippages = new Map<string, {
        stageName: string;
        totalSlippageDays: number;
        opportunityCount: number;
      }>();

      for (const [opportunityId, snapshots] of opportunityGroups) {
        if (snapshots.length < 2) continue; // Need at least 2 snapshots to calculate slippage

        let currentStage: string | null = null;
        let stageStartSnapshot: any = null;

        for (let i = 0; i < snapshots.length; i++) {
          const snapshot = snapshots[i];

          if (snapshot.stage !== currentStage) {
            // Stage changed - calculate slippage for previous stage
            if (currentStage && stageStartSnapshot && i > 0) {
              const previousSnapshot = snapshots[i - 1];
              const startCloseDate = new Date(stageStartSnapshot.expectedCloseDate);
              const endCloseDate = new Date(previousSnapshot.expectedCloseDate);
              const slippageDays = Math.round((endCloseDate.getTime() - startCloseDate.getTime()) / (1000 * 60 * 60 * 24));

              if (!stageSlippages.has(currentStage)) {
                stageSlippages.set(currentStage, {
                  stageName: currentStage,
                  totalSlippageDays: 0,
                  opportunityCount: 0
                });
              }

              const stageData = stageSlippages.get(currentStage)!;
              stageData.totalSlippageDays += slippageDays;
              stageData.opportunityCount += 1;
            }

            // Start tracking new stage
            currentStage = snapshot.stage;
            stageStartSnapshot = snapshot;
          }
        }
      }

      // Calculate averages and return results
      const results = Array.from(stageSlippages.values()).map(stage => ({
        stageName: stage.stageName,
        avgSlippageDays: stage.opportunityCount > 0 ? Math.round(stage.totalSlippageDays / stage.opportunityCount) : 0,
        opportunityCount: stage.opportunityCount,
        totalSlippageDays: stage.totalSlippageDays
      }));

      console.log(`📊 Stage slippage analysis complete: ${results.length} stages analyzed`);
      return results.sort((a, b) => Math.abs(b.avgSlippageDays) - Math.abs(a.avgSlippageDays));

    } catch (error) {
      console.error('❌ Error in stage slippage analysis:', error);
      return [];
    }
  }

  private getFiscalQuarter(date: Date): string {
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const year = date.getFullYear();
    
    // Fiscal quarters: Q1(Feb-Apr), Q2(May-Jul), Q3(Aug-Oct), Q4(Nov-Jan)
    if (month >= 2 && month <= 4) {
      return `${year} Q1`;
    } else if (month >= 5 && month <= 7) {
      return `${year} Q2`;
    } else if (month >= 8 && month <= 10) {
      return `${year} Q3`;
    } else { // Nov, Dec, Jan
      return `${month === 1 ? year : year + 1} Q4`;
    }
  }

  async getQuarterRetentionAnalysis(startDate?: Date, endDate?: Date): Promise<Array<{
    stageName: string;
    totalOpportunities: number;
    sameQuarterClosures: number;
    retentionRate: number;
  }>> {
    console.log('🔍 Starting quarter retention analysis...');
    
    try {
      // Get all snapshots including closed opportunities
      let whereConditions = [
        sql`${snapshots.expectedCloseDate} IS NOT NULL`,
        sql`${snapshots.stage} IS NOT NULL`
      ];

      // Apply date filters if provided
      if (startDate) whereConditions.push(sql`${snapshots.snapshotDate} >= ${startDate}`);
      if (endDate) whereConditions.push(sql`${snapshots.snapshotDate} <= ${endDate}`);

      const allSnapshots = await db
        .select({
          opportunityId: snapshots.opportunityId,
          snapshotDate: snapshots.snapshotDate,
          stage: snapshots.stage,
          expectedCloseDate: snapshots.expectedCloseDate,
        })
        .from(snapshots)
        .where(and(...whereConditions))
        .orderBy(snapshots.opportunityId, snapshots.snapshotDate);

      console.log(`📊 Found ${allSnapshots.length} snapshots for quarter retention analysis`);

      if (allSnapshots.length === 0) {
        return [];
      }

      // Group snapshots by opportunity to track stage entries
      const opportunityGroups = new Map<number, any[]>();
      for (const snapshot of allSnapshots) {
        const oppId = snapshot.opportunityId;
        if (oppId === null) continue;
        if (!opportunityGroups.has(oppId)) {
          opportunityGroups.set(oppId, []);
        }
        opportunityGroups.get(oppId)!.push(snapshot);
      }

      // Calculate quarter retention for each stage
      const stageRetention = new Map<string, {
        stageName: string;
        totalOpportunities: number;
        sameQuarterClosures: number;
      }>();

      for (const [opportunityId, snapshots] of opportunityGroups) {
        const closedSnapshot = snapshots.find((s: any) => s.stage === 'Closed Won' || s.stage === 'Closed Lost');
        if (!closedSnapshot) continue;

        const actualCloseDate = new Date(closedSnapshot.snapshotDate);
        const actualCloseFiscalQuarter = this.getFiscalQuarter(actualCloseDate);

        // Track each stage this opportunity entered
        const enteredStages = new Set<string>();
        for (const snapshot of snapshots) {
          if (!enteredStages.has(snapshot.stage) && snapshot.stage !== 'Closed Won' && snapshot.stage !== 'Closed Lost') {
            enteredStages.add(snapshot.stage);
            
            const stageEntryDate = new Date(snapshot.snapshotDate);
            const stageEntryFiscalQuarter = this.getFiscalQuarter(stageEntryDate);
            
            if (!stageRetention.has(snapshot.stage)) {
              stageRetention.set(snapshot.stage, {
                stageName: snapshot.stage,
                totalOpportunities: 0,
                sameQuarterClosures: 0
              });
            }

            const stageData = stageRetention.get(snapshot.stage)!;
            stageData.totalOpportunities += 1;
            
            if (stageEntryFiscalQuarter === actualCloseFiscalQuarter) {
              stageData.sameQuarterClosures += 1;
            }
          }
        }
      }

      // Calculate retention rates
      const results = Array.from(stageRetention.values()).map(stage => ({
        stageName: stage.stageName,
        totalOpportunities: stage.totalOpportunities,
        sameQuarterClosures: stage.sameQuarterClosures,
        retentionRate: stage.totalOpportunities > 0 ? 
          Math.round((stage.sameQuarterClosures / stage.totalOpportunities) * 100) : 0
      }));

      console.log(`📊 Quarter retention analysis complete: ${results.length} stages analyzed`);
      return results.sort((a, b) => b.retentionRate - a.retentionRate);

    } catch (error) {
      console.error('❌ Error in quarter retention analysis:', error);
      return [];
    }
  }

  async getValueChangesByStage(startDate?: Date, endDate?: Date): Promise<Array<{
    fromStage: string;
    toStage: string;
    opportunityCount: number;
    avgYear1ArrChange: number;
    avgTotalContractValueChange: number;
    totalYear1ArrChange: number;
    totalContractValueChange: number;
    year1ArrChangePercentage: number;
    totalContractValueChangePercentage: number;
  }>> {
    try {
      console.log('💰 Starting value changes by stage analysis...');
      
      // Get all snapshots ordered by opportunity and date
      const whereConditions = [];
      
      if (startDate && endDate) {
        whereConditions.push(gte(snapshots.snapshotDate, startDate));
        whereConditions.push(lte(snapshots.snapshotDate, endDate));
      }

      const allSnapshots = await db.select()
        .from(snapshots)
        .innerJoin(opportunities, eq(snapshots.opportunityId, opportunities.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(opportunities.opportunityId, snapshots.snapshotDate);

      console.log(`💰 Found ${allSnapshots.length} total snapshots for analysis`);

      // Group snapshots by opportunity
      const opportunityGroups = new Map<number, any[]>();
      for (const row of allSnapshots) {
        const snapshot = row.snapshots;
        const oppId = snapshot.opportunityId;
        if (oppId === null) continue;
        if (!opportunityGroups.has(oppId)) {
          opportunityGroups.set(oppId, []);
        }
        opportunityGroups.get(oppId)!.push(snapshot);
      }

      console.log(`💰 Grouped into ${opportunityGroups.size} opportunities`);

      // Track stage transitions
      const transitionMap = new Map<string, {
        fromStage: string;
        toStage: string;
        transitions: Array<{
          year1ArrChange: number;
          totalContractValueChange: number;
          fromYear1Arr: number;
          fromTotalContractValue: number;
          toYear1Arr: number;
          toTotalContractValue: number;
        }>;
      }>();

      // Process each opportunity to find stage transitions
      for (const [opportunityId, opportunitySnapshots] of opportunityGroups) {
        if (opportunitySnapshots.length < 2) continue;

        for (let i = 1; i < opportunitySnapshots.length; i++) {
          const previousSnapshot = opportunitySnapshots[i - 1];
          const currentSnapshot = opportunitySnapshots[i];

          if (previousSnapshot.stage !== currentSnapshot.stage) {
            const transitionKey = `${previousSnapshot.stage}`;

            if (!transitionMap.has(transitionKey)) {
              transitionMap.set(transitionKey, {
                fromStage: previousSnapshot.stage,
                toStage: '',
                transitions: []
              });
            }

            const fromYear1Arr = previousSnapshot.year1Value || 0;
            const fromTotalContractValue = previousSnapshot.year1_arr || 0;
            const toYear1Arr = currentSnapshot.year1Value || 0;
            const toTotalContractValue = currentSnapshot.year1_arr || 0;

            const year1ArrChange = toYear1Arr - fromYear1Arr;
            const totalContractValueChange = toTotalContractValue - fromTotalContractValue;

            transitionMap.get(transitionKey)!.transitions.push({
              year1ArrChange,
              totalContractValueChange,
              fromYear1Arr,
              fromTotalContractValue,
              toYear1Arr,
              toTotalContractValue
            });
          }
        }
      }

      // Group transitions by starting stage
      const stageGroups = new Map<string, any[]>();
      
      for (const transition of transitionMap.values()) {
        const fromStage = transition.fromStage;
        if (!stageGroups.has(fromStage)) {
          stageGroups.set(fromStage, []);
        }
        stageGroups.get(fromStage)!.push(...transition.transitions);
      }

      // Calculate aggregated metrics for each starting stage
      const results = Array.from(stageGroups.entries()).map(([fromStage, allTransitions]) => {
        const opportunityCount = allTransitions.length;

        if (opportunityCount === 0) {
          return {
            fromStage,
            toStage: '',
            opportunityCount: 0,
            avgYear1ArrChange: 0,
            avgTotalContractValueChange: 0,
            totalYear1ArrChange: 0,
            totalContractValueChange: 0,
            year1ArrChangePercentage: 0,
            totalContractValueChangePercentage: 0
          };
        }

        // Calculate totals and averages across all transitions from this stage
        const totalYear1ArrChange = allTransitions.reduce((sum: number, t: any) => sum + t.year1ArrChange, 0);
        const totalContractValueChange = allTransitions.reduce((sum: number, t: any) => sum + t.totalContractValueChange, 0);
        
        const avgYear1ArrChange = totalYear1ArrChange / opportunityCount;
        const avgTotalContractValueChange = totalContractValueChange / opportunityCount;

        // Calculate percentage changes based on original values (before transition)
        const totalFromYear1Arr = allTransitions.reduce((sum: number, t: any) => sum + t.fromYear1Arr, 0);
        const totalFromContractValue = allTransitions.reduce((sum: number, t: any) => sum + t.fromTotalContractValue, 0);

        const year1ArrChangePercentage = totalFromYear1Arr > 0 ? 
          (totalYear1ArrChange / totalFromYear1Arr) * 100 : 0;
        const totalContractValueChangePercentage = totalFromContractValue > 0 ? 
          (totalContractValueChange / totalFromContractValue) * 100 : 0;

        return {
          fromStage,
          toStage: '',
          opportunityCount,
          avgYear1ArrChange,
          avgTotalContractValueChange,
          totalYear1ArrChange,
          totalContractValueChange,
          year1ArrChangePercentage,
          totalContractValueChangePercentage
        };
      });

      // Filter out stages with no data and exclude Validation/Introduction
      const filteredResults = results
        .filter(r => r.opportunityCount > 0)
        .filter(r => r.fromStage !== 'Validation/Introduction');

      // Apply custom sort order based on stage progression
      const stageOrder = ['Discover', 'Developing Champions', 'ROI Analysis/Pricing', 'Negotiation/Review'];
      
      filteredResults.sort((a, b) => {
        const aIndex = stageOrder.indexOf(a.fromStage);
        const bIndex = stageOrder.indexOf(b.fromStage);
        return aIndex - bIndex;
      });

      console.log(`💰 Value changes analysis complete: ${filteredResults.length} stage transitions analyzed`);
      return filteredResults;

    } catch (error) {
      console.error('❌ Error in value changes analysis:', error);
      return [];
    }
  }

  async getLossReasonAnalysis(startDate?: string, endDate?: string): Promise<Array<{
    reason: string;
    count: number;
    totalValue: number;
    percentage: number;
  }>> {
    try {
      console.log('🔍 Loss reason analytics API endpoint called', startDate ? `with date range: ${startDate} to ${endDate}` : 'without date filter');
      
      // Get the most recent snapshot date
      const latestDateResult = await db
        .select({ maxDate: sql<string>`MAX(${snapshots.snapshotDate})::date::text` })
        .from(snapshots);
      
      const latestDateStr = latestDateResult[0]?.maxDate;
      
      if (!latestDateStr) {
        console.log('📊 No snapshots found in database');
        return [];
      }
      
      const targetDate = new Date(latestDateStr + ' 00:00:00');
      console.log(`📊 Using latest snapshot date: ${targetDate.toISOString()}`);

      // Verify this snapshot exists and has closed lost deals
      const verifySnapshot = await db
        .select({
          count: sql<number>`COUNT(*)`.as('count')
        })
        .from(snapshots)
        .where(and(
          sql`${snapshots.snapshotDate}::date = ${latestDateStr}::date`,
          eq(snapshots.stage, 'Closed Lost'),
          isNotNull(snapshots.opportunityId)
        ));

      const closedLostCount = verifySnapshot[0]?.count || 0;
      console.log(`📊 Found ${closedLostCount} closed lost deals in latest snapshot`);

      if (closedLostCount === 0) {
        console.log('📊 No closed lost deals found in latest snapshot');
        return [];
      }

      const mostRecentSnapshotDate = targetDate;

      // Get only closed lost deals from the most recent upload
      const latestSnapshots = await db
        .select({
          opportunityId: snapshots.opportunityId,
          stage: snapshots.stage,
          year1Value: snapshots.year1Value,
          lossReason: snapshots.lossReason,
          snapshotDate: snapshots.snapshotDate,
          closeDate: snapshots.closeDate,
          expectedCloseDate: snapshots.expectedCloseDate
        })
        .from(snapshots)
        .where(and(
          sql`${snapshots.snapshotDate}::date = ${latestDateStr}::date`,
          eq(snapshots.stage, 'Closed Lost'),
          isNotNull(snapshots.opportunityId)
        ))
        .orderBy(snapshots.snapshotDate);

      console.log(`📊 Found ${latestSnapshots.length} closed lost deals in latest snapshots`);

      const lossReasonDeals: Array<{
        reason: string;
        amount: number;
        closeDate: Date;
      }> = [];

      for (const snapshot of latestSnapshots) {
        // Use "Unknown" for missing or empty loss reasons
        const lossReason = snapshot.lossReason && snapshot.lossReason.trim() !== '' 
          ? snapshot.lossReason.trim() 
          : 'Unknown';
        
        // Use actual close date if available, otherwise use snapshot date
        const closeDate = snapshot.closeDate || snapshot.expectedCloseDate || snapshot.snapshotDate;
        
        lossReasonDeals.push({
          reason: lossReason,
          amount: Number(snapshot.year1Value) || 0,
          closeDate: new Date(closeDate)
        });
      }

      // Filter by actual close date if date parameters are provided
      let filteredDeals = lossReasonDeals;
      if (startDate && endDate) {
        const startFilterDate = new Date(startDate);
        const endFilterDate = new Date(endDate);
        
        filteredDeals = lossReasonDeals.filter(deal => {
          return deal.closeDate >= startFilterDate && deal.closeDate <= endFilterDate;
        });
        
        console.log(`📊 Filtered ${lossReasonDeals.length} deals to ${filteredDeals.length} based on close date range ${startDate} to ${endDate}`);
      }

      console.log(`🔍 Loss reason API returning: ${filteredDeals.length} results`);
      console.log(`🔍 Debug: Original deals: ${lossReasonDeals.length}, After filtering: ${filteredDeals.length}`);
      if (startDate && endDate) {
        console.log(`🔍 Debug: Date filter applied - ${startDate} to ${endDate}`);
        console.log(`🔍 Debug: Sample close dates:`, lossReasonDeals.slice(0, 3).map(d => d.closeDate.toISOString()));
      }

      if (filteredDeals.length === 0) {
        console.log(`🔍 Debug: No deals found after filtering - returning empty array`);
        return [];
      }

      // Group by loss reason
      const reasonGroups = new Map<string, {
        count: number;
        totalValue: number;
      }>();

      for (const deal of filteredDeals) {
        if (!reasonGroups.has(deal.reason)) {
          reasonGroups.set(deal.reason, {
            count: 0,
            totalValue: 0
          });
        }
        
        const group = reasonGroups.get(deal.reason)!;
        group.count += 1;
        group.totalValue += deal.amount;
      }

      const totalCount = filteredDeals.length;
      const results = Array.from(reasonGroups.entries()).map(([reason, data]) => ({
        reason,
        count: data.count,
        totalValue: data.totalValue,
        percentage: Math.round((data.count / totalCount * 100) * 10) / 10
      }));

      // Sort by count descending, then by total value descending
      results.sort((a, b) => {
        if (a.count !== b.count) return b.count - a.count;
        return b.totalValue - a.totalValue;
      });

      return results;
    } catch (error) {
      console.error('❌ Error in getLossReasonAnalysis:', error);
      return [];
    }
  }

  async getLossReasonByPreviousStage(startDate?: string, endDate?: string): Promise<Array<{
    reason: string;
    previousStage: string;
    count: number;
    totalValue: number;
    percentage: number;
  }>> {
    try {
      console.log('🔍 Loss reason by previous stage analytics API endpoint called', startDate ? `with date range: ${startDate} to ${endDate}` : 'without date filter');
      
      // Get the most recent snapshot date
      const latestDateResult = await db
        .select({ maxDate: sql<string>`MAX(${snapshots.snapshotDate})::date::text` })
        .from(snapshots);
      
      const latestDateStr = latestDateResult[0]?.maxDate;
      
      if (!latestDateStr) {
        console.log('📊 No snapshots found in database');
        return [];
      }
      
      const targetDate = new Date(latestDateStr + ' 00:00:00');
      console.log(`📊 Using latest snapshot date for loss reasons by stage: ${targetDate.toISOString()}`);
      
      // Get all snapshots from the target date
      const allSnapshots = await db
        .select({
          opportunityId: snapshots.opportunityId,
          stage: snapshots.stage,
          amount: snapshots.amount,
          year1Value: snapshots.year1Value,
          lossReason: snapshots.lossReason,
          snapshotDate: snapshots.snapshotDate,
          closeDate: snapshots.closeDate,
          expectedCloseDate: snapshots.expectedCloseDate,
        })
        .from(snapshots)
        .where(and(
          sql`${snapshots.snapshotDate}::date = ${latestDateStr}::date`,
          isNotNull(snapshots.opportunityId),
          isNotNull(snapshots.stage)
        ))
        .orderBy(snapshots.opportunityId, snapshots.snapshotDate);

      console.log(`📊 Found ${allSnapshots.length} snapshots from latest snapshot date`);

      // Get ALL closed lost deals with loss reasons, not filtered by date range
      // This ensures we capture all deals that became closed lost at any time
      const allClosedLostSnapshots = await db
        .select({
          opportunityId: snapshots.opportunityId,
          stage: snapshots.stage,
          amount: snapshots.amount,
          year1Value: snapshots.year1Value,
          lossReason: snapshots.lossReason,
          snapshotDate: snapshots.snapshotDate,
          closeDate: snapshots.closeDate,
          expectedCloseDate: snapshots.expectedCloseDate,
        })
        .from(snapshots)
        .where(and(
          eq(snapshots.stage, 'Closed Lost'),
          isNotNull(snapshots.opportunityId),
          isNotNull(snapshots.lossReason),
          sql`${snapshots.lossReason} != ''`,
          // Apply date filtering to when they became closed lost (if provided)
          ...(startDate ? [gte(snapshots.snapshotDate, new Date(startDate))] : []),
          ...(endDate ? [lte(snapshots.snapshotDate, new Date(endDate))] : [])
        ))
        .orderBy(snapshots.opportunityId, snapshots.snapshotDate);

      // Get the latest closed lost snapshot for each opportunity
      const latestClosedLostByOpportunity = new Map();
      for (const snapshot of allClosedLostSnapshots) {
        const oppId = snapshot.opportunityId!;
        if (!latestClosedLostByOpportunity.has(oppId) || 
            new Date(snapshot.snapshotDate) > new Date(latestClosedLostByOpportunity.get(oppId).snapshotDate)) {
          latestClosedLostByOpportunity.set(oppId, snapshot);
        }
      }
      
      const closedLostSnapshots = Array.from(latestClosedLostByOpportunity.values());
      console.log(`📊 Found ${closedLostSnapshots.length} unique closed lost deals with loss reasons across all snapshots`);

      // For each closed lost deal, get historical data to find the previous stage
      const lossReasonTransitions: Array<{
        reason: string;
        previousStage: string;
        amount: number;
        closeDate: Date;
      }> = [];

      // Get all historical snapshots to track stage transitions
      const allHistoricalSnapshots = await db
        .select({
          opportunityId: snapshots.opportunityId,
          stage: snapshots.stage,
          snapshotDate: snapshots.snapshotDate,
        })
        .from(snapshots)
        .where(and(
          isNotNull(snapshots.opportunityId),
          isNotNull(snapshots.stage)
        ))
        .orderBy(snapshots.opportunityId, snapshots.snapshotDate);

      // Group historical snapshots by opportunity
      const historicalGroups = new Map<number, any[]>();
      for (const snapshot of allHistoricalSnapshots) {
        if (!historicalGroups.has(snapshot.opportunityId!)) {
          historicalGroups.set(snapshot.opportunityId!, []);
        }
        historicalGroups.get(snapshot.opportunityId!)!.push(snapshot);
      }
      


      // For each closed lost deal, find its previous stage from historical data
      for (const closedLostSnapshot of closedLostSnapshots) {
        const opportunityId = closedLostSnapshot.opportunityId!;
        const historicalSnapshots = historicalGroups.get(opportunityId) || [];
        
        // Use the loss reason from the closed lost snapshot
        const lossReason = closedLostSnapshot.lossReason && closedLostSnapshot.lossReason.trim() !== '' 
          ? closedLostSnapshot.lossReason.trim() 
          : 'Unknown';
        
        let previousStage = null;
        
        // Find the most recent non-"Closed Lost" stage from historical data
        // Sort by snapshot date and find the last non-closed lost stage
        const sortedHistoricalSnapshots = historicalSnapshots
          .filter(s => s.stage !== 'Closed Lost' && s.stage !== null)
          .sort((a, b) => new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime());
        
        if (sortedHistoricalSnapshots.length > 0) {
          // Get the last (most recent) non-closed lost stage
          previousStage = sortedHistoricalSnapshots[sortedHistoricalSnapshots.length - 1].stage;
          console.log(`📊 Found previous stage from historical data: ${previousStage} for opportunity ${opportunityId}`);
        } else {
          // Check if we have stageBefore field as fallback
          const closedLostWithStageBefore = await db
            .select({
              stageBefore: snapshots.stageBefore
            })
            .from(snapshots)
            .where(and(
              eq(snapshots.opportunityId, opportunityId),
              eq(snapshots.stage, 'Closed Lost'),
              sql`${snapshots.snapshotDate}::date = ${latestDateStr}::date`
            ))
            .limit(1);
          
          if (closedLostWithStageBefore.length > 0 && closedLostWithStageBefore[0].stageBefore) {
            previousStage = closedLostWithStageBefore[0].stageBefore;
            console.log(`📊 Found previous stage from stageBefore field: ${previousStage} for opportunity ${opportunityId}`);
          }
        }
        
        // If no previous stage found, use a default
        if (!previousStage) {
          previousStage = 'Unknown Stage';
          console.log(`📊 No previous stage found for opportunity ${opportunityId}, using 'Unknown Stage'`);
        }
        
        lossReasonTransitions.push({
          reason: lossReason,
          previousStage: previousStage,
          amount: closedLostSnapshot.amount || closedLostSnapshot.year1Value || 0,
          closeDate: closedLostSnapshot.closeDate || closedLostSnapshot.snapshotDate
        });
      }

      // Now filter by the actual close date if date parameters are provided
      let filteredTransitions = lossReasonTransitions;
      if (startDate && endDate) {
        const startFilterDate = new Date(startDate);
        const endFilterDate = new Date(endDate);
        
        filteredTransitions = lossReasonTransitions.filter(transition => {
          return transition.closeDate >= startFilterDate && transition.closeDate <= endFilterDate;
        });
        
        console.log(`📊 Filtered ${lossReasonTransitions.length} transitions to ${filteredTransitions.length} based on close date range ${startDate} to ${endDate}`);
      }

      console.log(`📊 Found ${filteredTransitions.length} transitions to Closed Lost with loss reasons`);

      if (filteredTransitions.length === 0) {
        return [];
      }

      // Group by loss reason and previous stage
      const groupedResults = new Map<string, {
        reason: string;
        previousStage: string;
        count: number;
        totalValue: number;
      }>();

      for (const transition of filteredTransitions) {
        const key = `${transition.reason}|${transition.previousStage}`;
        
        if (!groupedResults.has(key)) {
          groupedResults.set(key, {
            reason: transition.reason,
            previousStage: transition.previousStage,
            count: 0,
            totalValue: 0
          });
        }

        const group = groupedResults.get(key)!;
        group.count += 1;
        group.totalValue += transition.amount;
      }

      const totalCount = lossReasonTransitions.length;
      
      const results = Array.from(groupedResults.values()).map(group => ({
        reason: group.reason,
        previousStage: group.previousStage,
        count: group.count,
        totalValue: group.totalValue,
        percentage: Math.round((group.count / totalCount * 100) * 10) / 10
      }));

      // Sort by reason first, then by count descending
      results.sort((a, b) => {
        if (a.reason !== b.reason) {
          return a.reason.localeCompare(b.reason);
        }
        return b.count - a.count;
      });

      console.log(`📊 Returning ${results.length} loss reason by previous stage results`);
      console.log('📊 Sample results:', results.slice(0, 3));
      console.log(`📊 Debug: Original transitions: ${lossReasonTransitions.length}, After filtering: ${filteredTransitions.length}`);
      if (startDate && endDate) {
        console.log(`📊 Debug: Date filter applied - ${startDate} to ${endDate}`);
        console.log(`📊 Debug: Sample close dates:`, lossReasonTransitions.slice(0, 3).map(d => d.closeDate.toISOString()));
      }

      return results;
    } catch (error) {
      console.error('❌ Error in getLossReasonByPreviousStage:', error);
      return [];
    }
  }

  async getRecentLosses(limit: number = 20): Promise<Array<{
    opportunityName: string;
    clientName?: string;
    lossReason: string;
    year1Value: number;
    closeDate: string;
    previousStage: string;
  }>> {
    try {
      console.log('🔍 Recent losses analysis: Getting recent closed lost deals');
      
      // Get the latest snapshot date from the database
      const latestSnapshot = await db
        .select({ snapshotDate: snapshots.snapshotDate })
        .from(snapshots)
        .orderBy(desc(snapshots.snapshotDate))
        .limit(1);

      if (!latestSnapshot || latestSnapshot.length === 0) {
        console.log('❌ No snapshots found');
        return [];
      }

      const targetDate = latestSnapshot[0].snapshotDate;
      console.log('🗓️ Using latest snapshot date for recent losses:', targetDate);
      
      // Get closed lost deals from the target snapshot
      const closedLostSnapshots = await db
        .select({
          opportunityId: snapshots.opportunityId,
          opportunityName: snapshots.opportunityName,
          accountName: snapshots.accountName,
          stage: snapshots.stage,
          amount: snapshots.amount,
          year1Value: snapshots.year1Value,
          lossReason: snapshots.lossReason,
          snapshotDate: snapshots.snapshotDate,
          closeDate: snapshots.closeDate,
          expectedCloseDate: snapshots.expectedCloseDate,
        })
        .from(snapshots)
        .where(and(
          eq(snapshots.snapshotDate, targetDate),
          eq(snapshots.stage, 'Closed Lost'),
          isNotNull(snapshots.opportunityId),
          isNotNull(snapshots.lossReason)
        ))
        .orderBy(desc(snapshots.closeDate), desc(snapshots.snapshotDate))
        .limit(limit);

      console.log(`📊 Found ${closedLostSnapshots.length} recent closed lost deals`);

      // Get all historical snapshots to find previous stages
      const allHistoricalSnapshots = await db
        .select({
          opportunityId: snapshots.opportunityId,
          stage: snapshots.stage,
          snapshotDate: snapshots.snapshotDate,
        })
        .from(snapshots)
        .where(and(
          isNotNull(snapshots.opportunityId),
          isNotNull(snapshots.stage)
        ))
        .orderBy(snapshots.opportunityId, snapshots.snapshotDate);

      // Group historical snapshots by opportunity
      const historicalGroups = new Map<number, any[]>();
      for (const snapshot of allHistoricalSnapshots) {
        if (!historicalGroups.has(snapshot.opportunityId!)) {
          historicalGroups.set(snapshot.opportunityId!, []);
        }
        historicalGroups.get(snapshot.opportunityId!)!.push(snapshot);
      }

      const recentLosses: Array<{
        opportunityName: string;
        clientName?: string;
        lossReason: string;
        year1Value: number;
        closeDate: string;
        previousStage: string;
      }> = [];

      for (const lossSnapshot of closedLostSnapshots) {
        const opportunityId = lossSnapshot.opportunityId!;
        const historicalSnapshots = historicalGroups.get(opportunityId) || [];
        
        // Find the previous non-"Closed Lost" stage from historical data
        let previousStage = 'Unknown';
        for (let i = historicalSnapshots.length - 1; i >= 0; i--) {
          if (historicalSnapshots[i].stage !== 'Closed Lost' && historicalSnapshots[i].stage !== null) {
            previousStage = historicalSnapshots[i].stage;
            break;
          }
        }

        const lossReason = lossSnapshot.lossReason?.trim() || 'Unknown';
        const year1Value = lossSnapshot.amount || lossSnapshot.year1Value || 0;
        const closeDate = lossSnapshot.closeDate || lossSnapshot.expectedCloseDate || lossSnapshot.snapshotDate;

        recentLosses.push({
          opportunityName: lossSnapshot.opportunityName || 'Unknown Opportunity',
          clientName: lossSnapshot.accountName || undefined,
          lossReason,
          year1Value: Number(year1Value),
          closeDate: closeDate.toISOString(),
          previousStage
        });
      }

      console.log(`📊 Processed ${recentLosses.length} recent losses with previous stages`);
      return recentLosses;

    } catch (error) {
      console.error('❌ Error in getRecentLosses:', error);
      return [];
    }
  }

  async getClosedWonFYData(startDate?: string, endDate?: string): Promise<{
    totalValue: number;
    totalCount: number;
    growth: number;
    deals: Array<{
      opportunityName: string;
      clientName?: string;
      value: number;
      closeDate: Date;
    }>;
  }> {
    try {
      console.log(`🏆 Closed Won FY Analysis called with date range: ${startDate} to ${endDate}`);
      
      // Get the most recent snapshot date
      const latestDateResult = await db
        .select({ maxDate: sql<string>`MAX(${snapshots.snapshotDate})::date::text` })
        .from(snapshots);
      
      const latestDateStr = latestDateResult[0]?.maxDate;
      
      if (!latestDateStr) {
        return { totalValue: 0, totalCount: 0, growth: 0, deals: [] };
      }
      
      console.log(`🏆 Using latest snapshot date: ${latestDateStr}`);
      
      // Build where conditions for date filtering
      let whereConditions = [
        sql`${snapshots.snapshotDate}::date = ${latestDateStr}::date`,
        sql`${snapshots.stage} = 'Closed Won'`,
        isNotNull(snapshots.opportunityId)
      ];
      
      // If date range is provided, filter by close date
      if (startDate && endDate) {
        whereConditions.push(
          sql`${snapshots.closeDate} >= ${startDate}`,
          sql`${snapshots.closeDate} <= ${endDate}`
        );
      }
      
      // Get closed won deals
      const closedWonSnapshots = await db
        .select({
          opportunityId: snapshots.opportunityId,
          opportunityName: snapshots.opportunityName,
          accountName: snapshots.accountName,
          year1Value: snapshots.year1Value,
          closeDate: snapshots.closeDate,
          expectedCloseDate: snapshots.expectedCloseDate,
          snapshotDate: snapshots.snapshotDate
        })
        .from(snapshots)
        .where(and(...whereConditions))
        .orderBy(desc(snapshots.closeDate), desc(snapshots.year1Value));
      
      console.log(`🏆 Found ${closedWonSnapshots.length} closed won deals`);
      
      // Calculate totals
      const uniqueDeals = new Map();
      let totalValue = 0;
      
      // Deduplicate by opportunity ID and sum values
      for (const snapshot of closedWonSnapshots) {
        if (snapshot.opportunityId && !uniqueDeals.has(snapshot.opportunityId)) {
          const value = Number(snapshot.year1Value) || 0;
          const closeDate = snapshot.closeDate || snapshot.expectedCloseDate || snapshot.snapshotDate;
          
          uniqueDeals.set(snapshot.opportunityId, {
            opportunityName: snapshot.opportunityName || 'Unknown',
            clientName: snapshot.accountName || undefined,
            value: value,
            closeDate: new Date(closeDate)
          });
          
          totalValue += value;
        }
      }
      
      const deals = Array.from(uniqueDeals.values());
      const totalCount = deals.length;
      
      // Calculate growth (placeholder - you can implement comparison to previous FY)
      let growth = 0;
      if (startDate && endDate) {
        // Calculate previous year's same period for growth comparison
        const prevYearStart = new Date(startDate);
        const prevYearEnd = new Date(endDate);
        prevYearStart.setFullYear(prevYearStart.getFullYear() - 1);
        prevYearEnd.setFullYear(prevYearEnd.getFullYear() - 1);
        
        const prevYearWhere = [
          sql`${snapshots.snapshotDate}::date = ${latestDateStr}::date`,
          sql`${snapshots.stage} = 'Closed Won'`,
          isNotNull(snapshots.opportunityId),
          sql`${snapshots.closeDate} >= ${prevYearStart.toISOString().split('T')[0]}`,
          sql`${snapshots.closeDate} <= ${prevYearEnd.toISOString().split('T')[0]}`
        ];
        
        const prevYearSnapshots = await db
          .select({
            opportunityId: snapshots.opportunityId,
            year1Value: snapshots.year1Value
          })
          .from(snapshots)
          .where(and(...prevYearWhere));
        
        const prevYearDeals = new Map();
        let prevYearValue = 0;
        
        for (const snapshot of prevYearSnapshots) {
          if (snapshot.opportunityId && !prevYearDeals.has(snapshot.opportunityId)) {
            const value = Number(snapshot.year1Value) || 0;
            prevYearDeals.set(snapshot.opportunityId, value);
            prevYearValue += value;
          }
        }
        
        if (prevYearValue > 0) {
          growth = ((totalValue - prevYearValue) / prevYearValue) * 100;
        } else if (totalValue > 0) {
          growth = 100; // 100% growth if no previous year data
        }
        
        console.log(`🏆 Growth calculation: Current: $${totalValue}, Previous: $${prevYearValue}, Growth: ${growth.toFixed(1)}%`);
      }
      
      console.log(`🏆 Closed Won FY Summary: ${totalCount} deals, $${totalValue.toLocaleString()} total value, ${growth.toFixed(1)}% growth`);
      
      return {
        totalValue,
        totalCount,
        growth,
        deals: deals.sort((a, b) => b.closeDate.getTime() - a.closeDate.getTime())
      };
      
    } catch (error) {
      console.error('❌ Error in getClosedWonFYData:', error);
      return { totalValue: 0, totalCount: 0, growth: 0, deals: [] };
    }
  }
}

export const storage = new PostgreSQLStorage();