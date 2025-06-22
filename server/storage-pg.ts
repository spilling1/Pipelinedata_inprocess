import { db } from './db.js';
import { eq, desc, asc, and, sql, gte, lte, isNull, or, notInArray } from 'drizzle-orm';
import { opportunities, snapshots, uploadedFiles, campaigns, campaignCustomers, campaignTypes, influenceMethods, type Opportunity, type Snapshot, type UploadedFile, type Campaign, type CampaignCustomer, type InsertOpportunity, type InsertSnapshot, type InsertUploadedFile, type InsertCampaign, type InsertCampaignCustomer } from '../shared/schema.js';

export interface IStorage {
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

  // Analytics
  getPipelineValueByDate(): Promise<Array<{ date: Date; value: number }>>;
  getStageDistribution(): Promise<Array<{ stage: string; count: number; value: number }>>;
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
  getStageTimingData(): Promise<Array<{ stage: string; avgDays: number; dealCount: number }>>;

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
  getClosingProbabilityData(): Promise<Array<{
    stage: string;
    totalDeals: number;
    closedWon: number;
    closedLost: number;
    winRate: number;
    conversionToNext: number;
  }>>;

  // Duplicate opportunities analysis (for specific end date)
  getDuplicateOpportunities(endDate?: string): Promise<Array<{
    clientName: string;
    opportunities: Array<{
      id: number;
      name: string;
      opportunityId: string;
      owner?: string;
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

  // Value changes by stage transition
  getValueChangesByStage(): Promise<Array<{
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

  // Marketing Analytics - Campaigns
  getCampaign(id: number): Promise<Campaign | undefined>;
  getCampaignByName(name: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign>;
  deleteCampaign(id: number): Promise<void>;
  getAllCampaigns(): Promise<Campaign[]>;

  // Marketing Analytics - Campaign Customers
  addCustomerToCampaign(campaignCustomer: InsertCampaignCustomer): Promise<CampaignCustomer>;
  removeCustomerFromCampaign(campaignId: number, opportunityId: number): Promise<void>;
  getCampaignCustomers(campaignId: number): Promise<Array<CampaignCustomer & { opportunity: Opportunity }>>;
  
  // Marketing Analytics - Campaign Analytics
  getCampaignOverviewMetrics(campaignId: number): Promise<{
    totalOpportunities: number;
    totalYear1Arr: number;
    totalTcv: number;
    winRate: number;
    closedWonCount: number;
    closedLostCount: number;
  }>;

  // Settings - Campaign Types
  getAllCampaignTypes(): Promise<Array<{ id: number; name: string; isActive: number }>>;
  createCampaignType(name: string): Promise<{ id: number; name: string; isActive: number }>;
  updateCampaignType(id: number, name: string): Promise<void>;
  deleteCampaignType(id: number): Promise<void>;

  // Settings - Influence Methods
  getAllInfluenceMethods(): Promise<Array<{ id: number; name: string; isActive: number }>>;
  createInfluenceMethod(name: string): Promise<{ id: number; name: string; isActive: number }>;
  updateInfluenceMethod(id: number, name: string): Promise<void>;
  deleteInfluenceMethod(id: number): Promise<void>;
  
  getCampaignComparisons(campaignType?: string): Promise<Array<{
    id: number;
    name: string;
    type: string;
    totalOpportunities: number;
    totalYear1Arr: number;
    totalTcv: number;
    winRate: number;
    cac: number | null;
    cost: number | null;
  }>>;
  
  getCampaignTypeAggregates(): Promise<Array<{
    type: string;
    campaignCount: number;
    avgCac: number;
    avgWinRate: number;
    totalOpportunities: number;
    totalPipelineValue: number;
  }>>;
}

export class PostgreSQLStorage implements IStorage {
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

  // Analytics methods - simplified implementations for now
  async getPipelineValueByDate(): Promise<Array<{ date: Date; value: number }>> {
    // For now, return empty array - will implement analytics once basic CRUD is working
    return [];
  }

  async getStageDistribution(): Promise<Array<{ stage: string; count: number; value: number }>> {
    return [];
  }

  async getFiscalYearPipeline(): Promise<Array<{ fiscalYear: string; value: number }>> {
    return [];
  }

  async getFiscalQuarterPipeline(): Promise<Array<{ fiscalQuarter: string; value: number }>> {
    return [];
  }

  async getMonthlyPipeline(): Promise<Array<{ month: string; value: number }>> {
    return [];
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
      amount: snapshots.amount,
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
      if (!opportunitySnapshots.has(snapshot.opportunityId)) {
        opportunitySnapshots.set(snapshot.opportunityId, []);
      }
      opportunitySnapshots.get(snapshot.opportunityId)!.push(snapshot);
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
    for (const [opportunityId, snapshots] of opportunitySnapshots) {
      // Sort snapshots by date
      snapshots.sort((a, b) => new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime());
      
      // Find stage transitions
      for (let i = 1; i < snapshots.length; i++) {
        const previousSnapshot = snapshots[i - 1];
        const currentSnapshot = snapshots[i];
        
        // If stage changed, record the movement
        if (previousSnapshot.stage !== currentSnapshot.stage) {
          movements.push({
            opportunityName: currentSnapshot.opportunityName,
            from: previousSnapshot.stage,
            to: currentSnapshot.stage,
            date: new Date(currentSnapshot.snapshotDate),
            value: currentSnapshot.amount || 0,
            opportunityId: currentSnapshot.opportunityIdString,
            clientName: currentSnapshot.clientName
          });
        }
      }
    }

    console.log(`📊 Deal movements analysis: Found ${movements.length} stage transitions in last ${days} days`);
    if (movements.length > 0) {
      console.log('🔄 Sample movements:', movements.slice(0, 3));
    }

    return movements;
  }

  async getStageTimingData(): Promise<Array<{ stage: string; avgDays: number; dealCount: number }>> {
    // Get all snapshots and group by opportunity
    const allSnapshots = await db.select().from(snapshots).orderBy(snapshots.snapshotDate);
    console.log(`🔍 Stage timing analysis: Found ${allSnapshots.length} total snapshots`);
    
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

      // Track stage transitions
      let currentStage: string | null = null;
      let currentStageStart: Date | null = null;

      for (const snapshot of sortedSnapshots) {
        const snapshotDate = new Date(snapshot.snapshotDate);

        if (!snapshot.stage) continue;

        // If this is the first snapshot or stage has changed
        if (currentStage === null || currentStage !== snapshot.stage) {
          // If we were tracking a previous stage, record its duration
          if (currentStage && currentStageStart) {
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
      }
    }

    console.log(`🔍 Stage timing analysis: Processed ${opportunitiesProcessed} opportunities, found ${stageTransitionsFound} stage transitions`);
    console.log(`🔍 Stage timing analysis: Found timing data for ${stageTimings.size} stages`);
    
    // Calculate averages and format results
    return Array.from(stageTimings.entries())
      .map(([stage, timing]) => ({
        stage,
        avgDays: Math.round((timing.totalDays / timing.count) * 10) / 10, // Round to 1 decimal
        dealCount: timing.count
      }))
      .filter(item => item.avgDays > 0) // Only include stages with positive duration
      .sort((a, b) => b.avgDays - a.avgDays); // Sort by longest average time first
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
    console.log('🔍 Starting date slippage analysis by stage...');

    try {
      // Get all snapshots with their opportunities, ordered by opportunity and snapshot date
      const allSnapshots = await db
        .select({
          id: snapshots.id,
          opportunityId: snapshots.opportunityId,
          snapshotDate: snapshots.snapshotDate,
          stage: snapshots.stage,
          expectedCloseDate: snapshots.expectedCloseDate,
          amount: snapshots.amount,
          opportunityName: opportunities.name,
        })
        .from(snapshots)
        .innerJoin(opportunities, eq(snapshots.opportunityId, opportunities.id))
        .where(and(
          sql`${snapshots.expectedCloseDate} IS NOT NULL`,
          sql`${snapshots.stage} IS NOT NULL`,
          sql`${snapshots.stage} NOT LIKE '%Closed%'`
        ))
        .orderBy(snapshots.opportunityId, snapshots.snapshotDate);

      console.log(`📊 Found ${allSnapshots.length} snapshots with expected close dates for slippage analysis`);

      if (allSnapshots.length === 0) {
        return [];
      }

      // Group snapshots by opportunity
      const opportunitySnapshots = new Map<number, typeof allSnapshots>();
      
      for (const snapshot of allSnapshots) {
        const oppId = snapshot.opportunityId;
        if (oppId === null) continue;
        
        if (!opportunitySnapshots.has(oppId)) {
          opportunitySnapshots.set(oppId, []);
        }
        opportunitySnapshots.get(oppId)!.push(snapshot);
      }

      console.log(`📊 Grouped into ${opportunitySnapshots.size} opportunities`);

      // Track slippage data by stage
      const stageSlippageData = new Map<string, {
        slippages: number[];
        values: number[];
        quarterEndDeals: number;
        quarterEndSlipped: number;
        worstCase: { opportunityName: string; slippageDays: number; value: number } | null;
      }>();

      let analyzedOpportunities = 0;

      for (const [opportunityId, opportunitySnaps] of Array.from(opportunitySnapshots.entries())) {
        // Need at least 2 snapshots to detect slippage
        if (opportunitySnaps.length < 2) continue;

        // Group snapshots by stage to track stage duration
        const stageGroups = new Map<string, typeof opportunitySnaps>();
        
        for (const snapshot of opportunitySnaps) {
          const stage = snapshot.stage || 'Unknown';
          if (!stageGroups.has(stage)) {
            stageGroups.set(stage, []);
          }
          stageGroups.get(stage)!.push(snapshot);
        }

        // For each stage, calculate slippage from first to last snapshot in that stage
        for (const [stageName, stageSnapshots] of Array.from(stageGroups.entries())) {
          if (stageSnapshots.length < 2) continue; // Need at least 2 snapshots in stage
          
          // Skip closed stages as they represent final outcomes, not active stages
          if (stageName.includes('Closed')) continue;

          const firstInStage = stageSnapshots[0];
          const lastInStage = stageSnapshots[stageSnapshots.length - 1];

          if (!firstInStage.expectedCloseDate || !lastInStage.expectedCloseDate) continue;

          const firstDate = new Date(firstInStage.expectedCloseDate);
          const lastDate = new Date(lastInStage.expectedCloseDate);
          const slippageDays = Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

          if (!stageSlippageData.has(stageName)) {
            stageSlippageData.set(stageName, {
              slippages: [],
              values: [],
              quarterEndDeals: 0,
              quarterEndSlipped: 0,
              worstCase: null
            });
          }

          const stageData = stageSlippageData.get(stageName)!;
          
          // Add slippage data (including 0 or negative slippage)
          stageData.slippages.push(slippageDays);
          stageData.values.push(lastInStage.amount || 0);

          // Check if first date was at quarter end (last month of fiscal quarter)
          const isQuarterEnd = this.isQuarterEndMonth(firstDate);
          
          if (isQuarterEnd) {
            stageData.quarterEndDeals++;
            const originalQuarter = this.getFiscalQuarter(firstDate);
            const actualQuarter = this.getFiscalQuarter(lastDate);
            if (originalQuarter !== actualQuarter) {
              stageData.quarterEndSlipped++;
            }
          }

          // Track worst case slippage
          if (slippageDays > 0 && (!stageData.worstCase || slippageDays > stageData.worstCase.slippageDays)) {
            stageData.worstCase = {
              opportunityName: firstInStage.opportunityName || 'Unknown',
              slippageDays,
              value: lastInStage.amount || 0
            };
          }
        }

        analyzedOpportunities++;
      }

      console.log(`📊 Analyzed ${analyzedOpportunities} opportunities for stage-based date slippage`);

      // Calculate aggregated metrics by stage
      const results: Array<{
        stageName: string;
        avgSlippageDays: number;
        dealCount: number;
        quarterEndSlippageRate: number;
        totalSlippedValue: number;
        worstCase: { opportunityName: string; slippageDays: number; value: number } | null;
      }> = [];

      for (const [stageName, data] of Array.from(stageSlippageData.entries())) {
        if (data.slippages.length === 0) continue;

        const avgSlippageDays = data.slippages.reduce((sum: number, days: number) => sum + days, 0) / data.slippages.length;
        const quarterEndSlippageRate = data.quarterEndDeals > 0 ? 
          (data.quarterEndSlipped / data.quarterEndDeals) * 100 : 0;
        const totalSlippedValue = data.values.reduce((sum: number, value: number) => sum + value, 0);

        results.push({
          stageName,
          avgSlippageDays: Math.round(avgSlippageDays * 10) / 10, // Round to 1 decimal
          dealCount: data.slippages.length,
          quarterEndSlippageRate: Math.round(quarterEndSlippageRate * 10) / 10,
          totalSlippedValue,
          worstCase: data.worstCase
        });
      }

      console.log(`📊 Date slippage analysis complete: ${results.length} stages analyzed`);
      console.log('📊 Sample results:', results.slice(0, 3).map(r => `${r.stageName}: ${r.avgSlippageDays} days avg slippage`));

      return results.sort((a, b) => b.avgSlippageDays - a.avgSlippageDays);

    } catch (error) {
      console.error('❌ Error in getDateSlippageData:', error);
      return [];
    }
  }

  private getFiscalQuarter(date: Date): string {
    // Fiscal year starts in February
    const fiscalYear = date.getMonth() >= 1 ? date.getFullYear() : date.getFullYear() - 1;
    const fiscalMonth = date.getMonth() >= 1 ? date.getMonth() - 1 : date.getMonth() + 11;
    const quarter = Math.floor(fiscalMonth / 3) + 1;
    return `FY${fiscalYear.toString().slice(-2)}Q${quarter}`;
  }

  private isQuarterEndMonth(date: Date): boolean {
    // Fiscal year starts in February, so quarter end months are: April, July, October, January
    const month = date.getMonth(); // 0-based
    return month === 3 || month === 6 || month === 9 || month === 0; // April, July, October, January
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

  async getClosingProbabilityData(): Promise<Array<{
    stage: string;
    totalDeals: number;
    closedWon: number;
    closedLost: number;
    winRate: number;
    conversionToNext: number;
  }>> {
    return [];
  }

  async getDuplicateOpportunities(endDate?: string): Promise<Array<{
    clientName: string;
    opportunities: Array<{
      id: number;
      name: string;
      opportunityId: string;
      owner?: string;
      latestSnapshot?: {
        stage: string;
        amount: number;
      };
    }>;
    totalValue: number;
    totalOpportunitiesCount: number;
    activeOpportunitiesCount: number;
  }>> {
    return [];
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

    // Note: We don't delete opportunities or uploaded files as they may be referenced by other dates
    console.log(`🗑️ Cleared all data for date: ${snapshotDate.toISOString().split('T')[0]}`);
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
        if (!opportunityGroups.has(snapshot.opportunityId)) {
          opportunityGroups.set(snapshot.opportunityId, []);
        }
        opportunityGroups.get(snapshot.opportunityId)!.push(snapshot);
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
        if (!opportunityGroups.has(snapshot.opportunityId)) {
          opportunityGroups.set(snapshot.opportunityId, []);
        }
        opportunityGroups.get(snapshot.opportunityId)!.push(snapshot);
      }

      // Calculate quarter retention for each stage
      const stageRetention = new Map<string, {
        stageName: string;
        totalOpportunities: number;
        sameQuarterClosures: number;
      }>();

      for (const [opportunityId, snapshots] of opportunityGroups) {
        const closedSnapshot = snapshots.find(s => s.stage === 'Closed Won' || s.stage === 'Closed Lost');
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

      // Group by opportunity to track stage transitions
      const opportunityGroups = new Map<number, any[]>();
      
      for (const row of allSnapshots) {
        const oppId = row.opportunities.id;
        if (!opportunityGroups.has(oppId)) {
          opportunityGroups.set(oppId, []);
        }
        opportunityGroups.get(oppId)!.push(row.snapshots);
      }

      console.log(`💰 Grouped into ${opportunityGroups.size} opportunities`);

      // Track stage transitions and value changes
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

      for (const [opportunityId, snapshotsData] of Array.from(opportunityGroups.entries())) {
        // Sort snapshots by date for this opportunity
        snapshotsData.sort((a: any, b: any) => new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime());
        
        // Track stage transitions
        for (let i = 1; i < snapshotsData.length; i++) {
          const prevSnapshot = snapshotsData[i - 1];
          const currentSnapshot = snapshotsData[i];
          
          // Skip if no stage info or same stage or if either is closed or moving to closed lost
          if (!prevSnapshot.stage || !currentSnapshot.stage ||
              prevSnapshot.stage === currentSnapshot.stage || 
              prevSnapshot.stage.includes('Closed') || 
              currentSnapshot.stage.includes('Closed Lost')) {
            continue;
          }

          const transitionKey = `${prevSnapshot.stage} → ${currentSnapshot.stage}`;
          
          if (!transitionMap.has(transitionKey)) {
            transitionMap.set(transitionKey, {
              fromStage: prevSnapshot.stage,
              toStage: currentSnapshot.stage,
              transitions: []
            });
          }

          // Calculate value changes
          const fromYear1Arr = prevSnapshot.year1Value || 0;
          const toYear1Arr = currentSnapshot.year1Value || 0;
          const fromTotalContractValue = prevSnapshot.amount || 0;
          const toTotalContractValue = currentSnapshot.amount || 0;

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
            toStage: 'Any Stage', // Indicate this aggregates all destinations
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
        const totalYear1ArrChange = allTransitions.reduce((sum, t) => sum + t.year1ArrChange, 0);
        const totalContractValueChange = allTransitions.reduce((sum, t) => sum + t.totalContractValueChange, 0);
        
        const avgYear1ArrChange = totalYear1ArrChange / opportunityCount;
        const avgTotalContractValueChange = totalContractValueChange / opportunityCount;



        // Calculate percentage changes based on original values (before transition)
        const totalFromYear1Arr = allTransitions.reduce((sum, t) => sum + t.fromYear1Arr, 0);
        const totalFromContractValue = allTransitions.reduce((sum, t) => sum + t.fromTotalContractValue, 0);

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

  // Marketing Analytics - Campaign Management
  async getCampaign(id: number): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign;
  }

  async getCampaignByName(name: string): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.name, name));
    return campaign;
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [newCampaign] = await db.insert(campaigns).values({
      ...campaign,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return newCampaign;
  }

  async updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign> {
    const [updatedCampaign] = await db.update(campaigns)
      .set({
        ...campaign,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, id))
      .returning();
    return updatedCampaign;
  }

  async deleteCampaign(id: number): Promise<void> {
    // First delete all campaign-customer associations
    await db.delete(campaignCustomers).where(eq(campaignCustomers.campaignId, id));
    // Then delete the campaign
    await db.delete(campaigns).where(eq(campaigns.id, id));
  }

  async getAllCampaigns(): Promise<Campaign[]> {
    return await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }

  // Marketing Analytics - Campaign Customer Management
  async previewCustomerSnapshot(opportunityId: number, targetDate: Date): Promise<{
    snapshotDate: Date;
    stage: string | null;
    year1Value: number | null;
    tcv: number | null;
    closeDate: Date | null;
  }> {
    console.log('🔍 Previewing snapshot for opportunity:', opportunityId, 'target date:', targetDate.toISOString().split('T')[0]);

    // Get snapshot data from the specified date or the closest date after it
    const snapshot = await db.select()
      .from(snapshots)
      .where(
        and(
          eq(snapshots.opportunityId, opportunityId),
          gte(snapshots.snapshotDate, targetDate)
        )
      )
      .orderBy(asc(snapshots.snapshotDate))
      .limit(1);

    let snapshotData = snapshot[0];
    
    // If no snapshot found on or after the target date, get the latest one before
    if (!snapshotData) {
      console.log('⚠️ No snapshot found on or after target date, looking for closest earlier snapshot');
      const earlierSnapshot = await db.select()
        .from(snapshots)
        .where(
          and(
            eq(snapshots.opportunityId, opportunityId),
            lte(snapshots.snapshotDate, targetDate)
          )
        )
        .orderBy(desc(snapshots.snapshotDate))
        .limit(1);
      
      snapshotData = earlierSnapshot[0];
    }
    
    if (!snapshotData) {
      throw new Error(`No snapshot data found for opportunity ${opportunityId}`);
    }

    console.log('📊 Preview found snapshot from:', snapshotData.snapshotDate);
    return {
      snapshotDate: snapshotData.snapshotDate,
      stage: snapshotData.stage,
      year1Value: snapshotData.year1Value,
      tcv: snapshotData.tcv,
      closeDate: snapshotData.closeDate,
    };
  }

  async addCustomerToCampaign(campaignCustomer: InsertCampaignCustomer): Promise<CampaignCustomer> {
    console.log('📝 Adding customer to campaign:', {
      campaignId: campaignCustomer.campaignId,
      opportunityId: campaignCustomer.opportunityId,
      snapshotDate: campaignCustomer.snapshotDate
    });

    const targetDate = new Date(campaignCustomer.snapshotDate);
    console.log('🎯 Target snapshot date:', targetDate.toISOString().split('T')[0]);

    // Get snapshot data from the specified date or the closest date after it
    const snapshot = await db.select()
      .from(snapshots)
      .where(
        and(
          eq(snapshots.opportunityId, campaignCustomer.opportunityId),
          gte(snapshots.snapshotDate, targetDate)
        )
      )
      .orderBy(asc(snapshots.snapshotDate))
      .limit(1);

    let snapshotData = snapshot[0];
    
    // If no snapshot found on or after the target date, get the latest one before
    if (!snapshotData) {
      console.log('⚠️ No snapshot found on or after target date, looking for closest earlier snapshot');
      const earlierSnapshot = await db.select()
        .from(snapshots)
        .where(
          and(
            eq(snapshots.opportunityId, campaignCustomer.opportunityId),
            lte(snapshots.snapshotDate, targetDate)
          )
        )
        .orderBy(desc(snapshots.snapshotDate))
        .limit(1);
      
      snapshotData = earlierSnapshot[0];
    }
    
    if (!snapshotData) {
      console.error('❌ No snapshot data found for opportunity:', campaignCustomer.opportunityId);
      throw new Error(`No snapshot data found for opportunity ${campaignCustomer.opportunityId}`);
    }

    console.log('📊 Using snapshot data from:', {
      snapshotDate: snapshotData.snapshotDate,
      stage: snapshotData.stage,
      year1Value: snapshotData.year1Value,
      tcv: snapshotData.tcv
    });
    
    const [newAssociation] = await db.insert(campaignCustomers).values({
      ...campaignCustomer,
      stage: snapshotData.stage || null,
      year1Arr: snapshotData.year1Value || null,
      tcv: snapshotData.tcv || null,
      closeDate: snapshotData.closeDate || null,
      snapshotDate: snapshotData.snapshotDate, // Use actual snapshot date
      createdAt: new Date(),
    }).returning();
    
    console.log('✅ Successfully added customer to campaign:', newAssociation.id);
    return newAssociation;
  }

  async removeCustomerFromCampaign(campaignId: number, opportunityId: number): Promise<void> {
    await db.delete(campaignCustomers)
      .where(
        and(
          eq(campaignCustomers.campaignId, campaignId),
          eq(campaignCustomers.opportunityId, opportunityId)
        )
      );
  }

  async getRecentCustomersForCampaigns(): Promise<Array<{
    opportunityId: number;
    opportunityName: string;
    clientName?: string;
    stage?: string;
    year1Arr?: number;
    tcv?: number;
    latestSnapshotDate: string;
  }>> {
    try {
      // Get all snapshots ordered by date desc to find the most recent upload
      const allSnapshots = await db
        .select({
          opportunityId: opportunities.id,
          opportunityName: opportunities.name,
          clientName: opportunities.clientName,
          stage: snapshots.stage,
          year1Arr: snapshots.year1Value,
          tcv: snapshots.tcv,
          snapshotDate: snapshots.snapshotDate,
        })
        .from(opportunities)
        .innerJoin(snapshots, eq(opportunities.id, snapshots.opportunityId))
        .orderBy(desc(snapshots.snapshotDate));

      if (allSnapshots.length === 0) {
        return [];
      }

      // Get the most recent snapshot date
      const mostRecentDate = allSnapshots[0].snapshotDate;
      
      // Filter to only include snapshots from the most recent date
      const customersFromLatestUpload = allSnapshots.filter(row => {
        const rowDate = new Date(row.snapshotDate);
        const recentDate = new Date(mostRecentDate);
        return rowDate.toDateString() === recentDate.toDateString();
      });

      return customersFromLatestUpload.map(row => ({
        opportunityId: row.opportunityId,
        opportunityName: row.opportunityName || `Opportunity ${row.opportunityId}`,
        clientName: row.clientName || undefined,
        stage: row.stage || undefined,
        year1Arr: row.year1Arr || undefined,
        tcv: row.tcv || undefined,
        latestSnapshotDate: new Date(row.snapshotDate).toISOString().split('T')[0],
      })).sort((a, b) => (a.clientName || '').localeCompare(b.clientName || ''));
    } catch (error) {
      console.error('Error fetching customers from latest upload:', error);
      return [];
    }
  }

  async getCampaignCustomers(campaignId: number): Promise<Array<CampaignCustomer & { opportunity: Opportunity }>> {
    console.log('🔍 getCampaignCustomers called for campaign:', campaignId);
    
    const result = await db.select({
      id: campaignCustomers.id,
      campaignId: campaignCustomers.campaignId,
      opportunityId: campaignCustomers.opportunityId,
      snapshotDate: campaignCustomers.snapshotDate,
      stage: campaignCustomers.stage,
      year1Arr: campaignCustomers.year1Arr,
      tcv: campaignCustomers.tcv,
      closeDate: campaignCustomers.closeDate,
      createdAt: campaignCustomers.createdAt,
      opportunity: {
        id: opportunities.id,
        opportunityId: opportunities.opportunityId,
        name: opportunities.name,
        clientName: opportunities.clientName,
        owner: opportunities.owner,
        createdDate: opportunities.createdDate,
      }
    })
    .from(campaignCustomers)
    .innerJoin(opportunities, eq(campaignCustomers.opportunityId, opportunities.id))
    .where(eq(campaignCustomers.campaignId, campaignId));

    console.log('📊 Found campaign customers:', result.length);
    if (result.length > 0) {
      console.log('📝 Sample customer result:', {
        id: result[0].id,
        opportunityName: result[0].opportunity.name,
        stage: result[0].stage,
        year1Arr: result[0].year1Arr
      });
    }

    return result.map(row => ({
      ...row,
      opportunity: row.opportunity as Opportunity
    }));
  }

  // Marketing Analytics - Campaign Analytics
  async getCampaignAnalytics(campaignId: number): Promise<{
    totalOpportunities: number;
    totalYear1Arr: number;
    totalTcv: number;
    winRate: number;
    closedWonCount: number;
    closedLostCount: number;
    cac: number | null;
    customers: Array<{
      opportunityName: string;
      stage: string;
      year1Arr: number | null;
      tcv: number | null;
    }>;
  }> {
    // Get campaign details for CAC calculation
    const campaign = await this.getCampaign(campaignId);
    
    // Get metrics
    const result = await db.select({
      totalOpportunities: sql<number>`COUNT(*)`,
      totalYear1Arr: sql<number>`COALESCE(SUM(${campaignCustomers.year1Arr}), 0)`,
      totalTcv: sql<number>`COALESCE(SUM(${campaignCustomers.tcv}), 0)`,
      closedWonCount: sql<number>`COUNT(CASE WHEN ${campaignCustomers.stage} = 'Closed/Won' THEN 1 END)`,
      closedLostCount: sql<number>`COUNT(CASE WHEN ${campaignCustomers.stage} = 'Closed/Lost' THEN 1 END)`,
    })
    .from(campaignCustomers)
    .where(eq(campaignCustomers.campaignId, campaignId));

    // Get customer details
    const customers = await db.select({
      opportunityName: opportunities.name,
      stage: campaignCustomers.stage,
      year1Arr: campaignCustomers.year1Arr,
      tcv: campaignCustomers.tcv,
    })
    .from(campaignCustomers)
    .innerJoin(opportunities, eq(campaignCustomers.opportunityId, opportunities.id))
    .where(eq(campaignCustomers.campaignId, campaignId));

    const metrics = result[0] || {
      totalOpportunities: 0,
      totalYear1Arr: 0,
      totalTcv: 0,
      closedWonCount: 0,
      closedLostCount: 0,
    };

    const winRate = metrics.totalOpportunities > 0 
      ? metrics.closedWonCount / metrics.totalOpportunities
      : 0;

    // Calculate CAC (Customer Acquisition Cost)
    const cac = campaign?.cost && metrics.closedWonCount > 0 
      ? campaign.cost / metrics.closedWonCount 
      : null;

    return {
      totalOpportunities: metrics.totalOpportunities,
      totalYear1Arr: metrics.totalYear1Arr,
      totalTcv: metrics.totalTcv,
      winRate: winRate,
      closedWonCount: metrics.closedWonCount,
      closedLostCount: metrics.closedLostCount,
      cac: cac,
      customers: customers,
    };
  }

  async getCampaignOverviewMetrics(campaignId: number): Promise<{
    totalOpportunities: number;
    totalYear1Arr: number;
    totalTcv: number;
    winRate: number;
    closedWonCount: number;
    closedLostCount: number;
  }> {
    const result = await db.select({
      totalOpportunities: sql<number>`COUNT(*)`,
      totalYear1Arr: sql<number>`COALESCE(SUM(${campaignCustomers.year1Arr}), 0)`,
      totalTcv: sql<number>`COALESCE(SUM(${campaignCustomers.tcv}), 0)`,
      closedWonCount: sql<number>`COUNT(CASE WHEN ${campaignCustomers.stage} = 'Closed/Won' THEN 1 END)`,
      closedLostCount: sql<number>`COUNT(CASE WHEN ${campaignCustomers.stage} = 'Closed/Lost' THEN 1 END)`,
    })
    .from(campaignCustomers)
    .where(eq(campaignCustomers.campaignId, campaignId));

    const metrics = result[0];
    const winRate = metrics.totalOpportunities > 0 
      ? (metrics.closedWonCount / metrics.totalOpportunities) * 100 
      : 0;

    return {
      totalOpportunities: metrics.totalOpportunities,
      totalYear1Arr: metrics.totalYear1Arr,
      totalTcv: metrics.totalTcv,
      winRate: Math.round(winRate * 100) / 100,
      closedWonCount: metrics.closedWonCount,
      closedLostCount: metrics.closedLostCount,
    };
  }

  async getCampaignComparisons(campaignType?: string): Promise<Array<{
    id: number;
    name: string;
    type: string;
    totalOpportunities: number;
    totalYear1Arr: number;
    totalTcv: number;
    winRate: number;
    cac: number | null;
    cost: number | null;
  }>> {
    const whereCondition = campaignType ? eq(campaigns.type, campaignType) : undefined;

    const result = await db.select({
      id: campaigns.id,
      name: campaigns.name,
      type: campaigns.type,
      cost: campaigns.cost,
      totalOpportunities: sql<number>`COUNT(${campaignCustomers.id})`,
      totalYear1Arr: sql<number>`COALESCE(SUM(${campaignCustomers.year1Arr}), 0)`,
      totalTcv: sql<number>`COALESCE(SUM(${campaignCustomers.tcv}), 0)`,
      closedWonCount: sql<number>`COUNT(CASE WHEN ${campaignCustomers.stage} = 'Closed/Won' THEN 1 END)`,
    })
    .from(campaigns)
    .leftJoin(campaignCustomers, eq(campaigns.id, campaignCustomers.campaignId))
    .where(whereCondition)
    .groupBy(campaigns.id, campaigns.name, campaigns.type, campaigns.cost);

    return result.map(row => {
      const winRate = row.totalOpportunities > 0 
        ? (row.closedWonCount / row.totalOpportunities) * 100 
        : 0;
      
      const cac = row.cost && row.closedWonCount > 0 
        ? row.cost / row.closedWonCount 
        : null;

      return {
        id: row.id,
        name: row.name,
        type: row.type,
        totalOpportunities: row.totalOpportunities,
        totalYear1Arr: row.totalYear1Arr,
        totalTcv: row.totalTcv,
        winRate: Math.round(winRate * 100) / 100,
        cac: cac ? Math.round(cac * 100) / 100 : null,
        cost: row.cost,
      };
    });
  }

  async getCampaignTypeAggregates(): Promise<Array<{
    type: string;
    campaignCount: number;
    avgCac: number;
    avgWinRate: number;
    totalOpportunities: number;
    totalPipelineValue: number;
  }>> {
    const result = await db.select({
      type: campaigns.type,
      campaignCount: sql<number>`COUNT(DISTINCT ${campaigns.id})`,
      totalCost: sql<number>`COALESCE(SUM(${campaigns.cost}), 0)`,
      totalOpportunities: sql<number>`COUNT(${campaignCustomers.id})`,
      totalPipelineValue: sql<number>`COALESCE(SUM(${campaignCustomers.year1Arr}), 0)`,
      totalClosedWon: sql<number>`COUNT(CASE WHEN ${campaignCustomers.stage} = 'Closed/Won' THEN 1 END)`,
    })
    .from(campaigns)
    .leftJoin(campaignCustomers, eq(campaigns.id, campaignCustomers.campaignId))
    .groupBy(campaigns.type);

    return result.map(row => {
      const avgWinRate = row.totalOpportunities > 0 
        ? (row.totalClosedWon / row.totalOpportunities) * 100 
        : 0;
      
      const avgCac = row.totalClosedWon > 0 && row.totalCost > 0
        ? row.totalCost / row.totalClosedWon 
        : 0;

      return {
        type: row.type,
        campaignCount: row.campaignCount,
        avgCac: Math.round(avgCac * 100) / 100,
        avgWinRate: Math.round(avgWinRate * 100) / 100,
        totalOpportunities: row.totalOpportunities,
        totalPipelineValue: row.totalPipelineValue,
      };
    });
  }

  // Settings - Campaign Types
  async getAllCampaignTypes(): Promise<Array<{ id: number; name: string; isActive: number }>> {
    return await db.select({
      id: campaignTypes.id,
      name: campaignTypes.name,
      isActive: campaignTypes.isActive,
    })
    .from(campaignTypes)
    .where(eq(campaignTypes.isActive, 1))
    .orderBy(asc(campaignTypes.name));
  }

  async createCampaignType(name: string): Promise<{ id: number; name: string; isActive: number }> {
    const [result] = await db.insert(campaignTypes)
      .values({ name, isActive: 1 })
      .returning();
    return result;
  }

  async updateCampaignType(id: number, name: string): Promise<void> {
    await db.update(campaignTypes)
      .set({ name })
      .where(eq(campaignTypes.id, id));
  }

  async deleteCampaignType(id: number): Promise<void> {
    await db.update(campaignTypes)
      .set({ isActive: 0 })
      .where(eq(campaignTypes.id, id));
  }

  // Settings - Influence Methods
  async getAllInfluenceMethods(): Promise<Array<{ id: number; name: string; isActive: number }>> {
    return await db.select({
      id: influenceMethods.id,
      name: influenceMethods.name,
      isActive: influenceMethods.isActive,
    })
    .from(influenceMethods)
    .where(eq(influenceMethods.isActive, 1))
    .orderBy(asc(influenceMethods.name));
  }

  async createInfluenceMethod(name: string): Promise<{ id: number; name: string; isActive: number }> {
    const [result] = await db.insert(influenceMethods)
      .values({ name, isActive: 1 })
      .returning();
    return result;
  }

  async updateInfluenceMethod(id: number, name: string): Promise<void> {
    await db.update(influenceMethods)
      .set({ name })
      .where(eq(influenceMethods.id, id));
  }

  async deleteInfluenceMethod(id: number): Promise<void> {
    await db.update(influenceMethods)
      .set({ isActive: 0 })
      .where(eq(influenceMethods.id, id));
  }
}

export const storage = new PostgreSQLStorage();