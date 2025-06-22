import { 
  opportunities, 
  snapshots, 
  uploadedFiles,
  type Opportunity, 
  type Snapshot, 
  type UploadedFile,
  type InsertOpportunity, 
  type InsertSnapshot, 
  type InsertUploadedFile 
} from "@shared/schema";

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

  // Loss reason analysis
  getLossReasonAnalysis(): Promise<Array<{
    reason: string;
    count: number;
    totalValue: number;
    percentage: number;
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
}

import { db } from './database.js';
import { eq, desc, asc, and, sql, gte, lte, isNull, or } from 'drizzle-orm';

export class PostgreSQLStorage implements IStorage {
  private stageMappings: Array<{ from: string; to: string }> = [
    { from: 'develop', to: 'Developing Champions' },
    { from: 'decision', to: 'Negotiation/Review' }
  ];
  private probabilityConfigs: Array<{ stage: string; confidence: string; probability: number }> = [
    { stage: 'Validation/Introduction', confidence: 'Pipeline', probability: 0 },
    { stage: 'Validation/Introduction', confidence: 'Upside', probability: 0 },
    { stage: 'Discover', confidence: 'Pipeline', probability: 10 },
    { stage: 'Discover', confidence: 'Upside', probability: 15 },
    { stage: 'Discover', confidence: 'Likely', probability: 20 },
    { stage: 'Developing Champions', confidence: 'Pipeline', probability: 30 },
    { stage: 'Developing Champions', confidence: 'Upside', probability: 35 },
    { stage: 'Developing Champions', confidence: 'Likely', probability: 45 },
    { stage: 'ROI Analysis/Pricing', confidence: 'Pipeline', probability: 50 },
    { stage: 'ROI Analysis/Pricing', confidence: 'Upside', probability: 55 },
    { stage: 'ROI Analysis/Pricing', confidence: 'Likely', probability: 65 },
    { stage: 'Negotiation/Review', confidence: 'Likely', probability: 75 },
    { stage: 'Negotiation/Review', confidence: 'Upside', probability: 85 },
    { stage: 'Negotiation/Review', confidence: 'Commit', probability: 95 },
    { stage: 'Closed Won', confidence: 'Closed', probability: 100 },
    { stage: 'Otherwise', confidence: '', probability: 0 }
  ];


  async getOpportunity(id: number): Promise<Opportunity | undefined> {
    return this.opportunities.get(id);
  }

  async getOpportunityByName(name: string): Promise<Opportunity | undefined> {
    return Array.from(this.opportunities.values()).find(opp => opp.name === name);
  }

  async createOpportunity(insertOpportunity: InsertOpportunity): Promise<Opportunity> {
    const id = this.currentOpportunityId++;
    const opportunity: Opportunity = { ...insertOpportunity, id };
    this.opportunities.set(id, opportunity);
    return opportunity;
  }

  async getOpportunityById(opportunityId: string): Promise<Opportunity | undefined> {
    return Array.from(this.opportunities.values())
      .find(opp => opp.opportunityId === opportunityId);
  }

  async getAllOpportunities(): Promise<Opportunity[]> {
    return Array.from(this.opportunities.values());
  }

  async getSnapshot(id: number): Promise<Snapshot | undefined> {
    return this.snapshots.get(id);
  }

  async getSnapshotsByOpportunity(opportunityId: number): Promise<Snapshot[]> {
    return Array.from(this.snapshots.values())
      .filter(snapshot => snapshot.opportunityId === opportunityId)
      .sort((a, b) => new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime());
  }

  async getSnapshotsByDateRange(startDate: Date, endDate: Date): Promise<Snapshot[]> {
    return Array.from(this.snapshots.values())
      .filter(snapshot => {
        const snapshotDate = new Date(snapshot.snapshotDate);
        return snapshotDate >= startDate && snapshotDate <= endDate;
      });
  }

  async createSnapshot(insertSnapshot: InsertSnapshot): Promise<Snapshot> {
    const id = this.currentSnapshotId++;
    const snapshot: Snapshot = { ...insertSnapshot, id };
    this.snapshots.set(id, snapshot);
    return snapshot;
  }

  async getAllSnapshots(): Promise<Snapshot[]> {
    return Array.from(this.snapshots.values());
  }

  async getLatestSnapshotByOpportunity(opportunityId: number): Promise<Snapshot | undefined> {
    const snapshots = await this.getSnapshotsByOpportunity(opportunityId);
    return snapshots[snapshots.length - 1];
  }

  async getUploadedFile(id: number): Promise<UploadedFile | undefined> {
    return this.uploadedFiles.get(id);
  }

  async createUploadedFile(insertFile: InsertUploadedFile): Promise<UploadedFile> {
    const id = this.currentFileId++;
    const file: UploadedFile = { 
      ...insertFile, 
      id, 
      uploadDate: new Date(),
    };
    this.uploadedFiles.set(id, file);
    return file;
  }

  async getAllUploadedFiles(): Promise<UploadedFile[]> {
    return Array.from(this.uploadedFiles.values())
      .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
  }

  async getPipelineValueByDate(): Promise<Array<{ date: Date; value: number }>> {
    const snapshotsByDate = new Map<string, number>();
    
    for (const snapshot of this.snapshots.values()) {
      // Filter out closed and validation stages
      if (snapshot.stage && 
          !snapshot.stage.includes('Closed Won') && 
          !snapshot.stage.includes('Closed Lost') && 
          !snapshot.stage.includes('Validation/Introduction')) {
        const dateKey = new Date(snapshot.snapshotDate).toISOString().split('T')[0];
        const currentValue = snapshotsByDate.get(dateKey) || 0;
        snapshotsByDate.set(dateKey, currentValue + (snapshot.amount || 0));
      }
    }

    return Array.from(snapshotsByDate.entries())
      .map(([dateStr, value]) => ({ date: new Date(dateStr), value }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  async getStageDistribution(): Promise<Array<{ stage: string; count: number; value: number }>> {
    const stageMap = new Map<string, { count: number; value: number }>();

    // Get latest snapshot for each opportunity
    const opportunityIds = new Set(Array.from(this.snapshots.values()).map(s => s.opportunityId));
    
    for (const oppId of opportunityIds) {
      if (oppId) {
        const latestSnapshot = await this.getLatestSnapshotByOpportunity(oppId);
        if (latestSnapshot && latestSnapshot.stage) {
          const current = stageMap.get(latestSnapshot.stage) || { count: 0, value: 0 };
          stageMap.set(latestSnapshot.stage, {
            count: current.count + 1,
            value: current.value + (latestSnapshot.amount || 0)
          });
        }
      }
    }

    return Array.from(stageMap.entries()).map(([stage, data]) => ({ stage, ...data }));
  }

  async getFiscalYearPipeline(): Promise<Array<{ fiscalYear: string; value: number }>> {
    const fiscalYearMap = new Map<string, number>();
    
    // Helper function to get fiscal year from a date
    const getFiscalYear = (date: Date): string => {
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-based (0 = January, 1 = February)
      
      // If month is January (0), it belongs to the previous fiscal year
      // Fiscal year starts Feb 1, so Jan belongs to the previous FY
      if (month === 0) {
        return `FY${year}`;
      } else {
        return `FY${year + 1}`;
      }
    };
    
    // Get the most recent uploaded file
    const allFiles = await this.getAllUploadedFiles();
    if (allFiles.length === 0) {
      return [];
    }
    
    const mostRecentFile = allFiles.sort((a, b) => 
      new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
    )[0];
    
    console.log(`📊 Using most recent file for FY pipeline: ${mostRecentFile.filename} (uploaded: ${mostRecentFile.uploadDate})`);
    
    // Get all snapshots from the most recent file date
    const mostRecentDate = mostRecentFile.snapshotDate;
    if (!mostRecentDate) {
      return [];
    }
    
    const recentSnapshots = await this.getSnapshotsByDateRange(
      new Date(mostRecentDate), 
      new Date(mostRecentDate)
    );
    
    let fy2025Count = 0;
    let fy2025Value = 0;
    
    for (const snapshot of recentSnapshots) {
      if (snapshot.stage && 
          !snapshot.stage.includes('Closed Won') && 
          !snapshot.stage.includes('Closed Lost') && 
          !snapshot.stage.includes('Validation/Introduction') &&
          snapshot.expectedCloseDate &&
          snapshot.opportunityId) {
        
        const fiscalYear = getFiscalYear(new Date(snapshot.expectedCloseDate));
        const currentValue = fiscalYearMap.get(fiscalYear) || 0;
        fiscalYearMap.set(fiscalYear, currentValue + (snapshot.amount || 0));
        
        // Track FY2025 deals specifically
        if (fiscalYear === 'FY2025') {
          fy2025Count++;
          fy2025Value += (snapshot.amount || 0);
          const opportunity = await this.getOpportunity(snapshot.opportunityId);
          console.log(`📊 FY2025 Pipeline Deal: ${opportunity?.name || 'Unknown'} - $${snapshot.amount?.toLocaleString()} - Stage: ${snapshot.stage} - Close Date: ${snapshot.expectedCloseDate} - File: ${mostRecentFile.filename}`);
        }
      }
    }
    
    if (fy2025Count > 0) {
      console.log(`📊 FY2025 Pipeline Summary from ${mostRecentFile.filename}: ${fy2025Count} deals totaling $${fy2025Value.toLocaleString()}`);
    }

    return Array.from(fiscalYearMap.entries())
      .map(([fiscalYear, value]) => ({ fiscalYear, value }))
      .sort((a, b) => a.fiscalYear.localeCompare(b.fiscalYear));
  }

  async getFiscalQuarterPipeline(): Promise<Array<{ fiscalQuarter: string; value: number }>> {
    const fiscalQuarterMap = new Map<string, number>();
    
    // Helper function to get fiscal quarter from a date
    const getFiscalQuarter = (date: Date): string => {
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-based (0 = January, 1 = February)
      
      // Fiscal year starts Feb 1, so quarters are:
      // Q1: Feb, Mar, Apr
      // Q2: May, Jun, Jul  
      // Q3: Aug, Sep, Oct
      // Q4: Nov, Dec, Jan
      
      let quarter: number;
      let fiscalYear: number;
      
      if (month >= 1 && month <= 3) { // Feb, Mar, Apr
        quarter = 1;
        fiscalYear = year + 1;
      } else if (month >= 4 && month <= 6) { // May, Jun, Jul
        quarter = 2;
        fiscalYear = year + 1;
      } else if (month >= 7 && month <= 9) { // Aug, Sep, Oct
        quarter = 3;
        fiscalYear = year + 1;
      } else { // Nov, Dec, Jan
        quarter = 4;
        if (month === 0) { // January
          fiscalYear = year;
        } else { // Nov, Dec
          fiscalYear = year + 1;
        }
      }
      
      return `FY${fiscalYear} Q${quarter}`;
    };
    
    // Get the most recent uploaded file
    const allFiles = await this.getAllUploadedFiles();
    if (allFiles.length === 0) {
      return [];
    }
    
    const mostRecentFile = allFiles.sort((a, b) => 
      new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
    )[0];
    
    // Get all snapshots from the most recent file date
    const mostRecentDate = mostRecentFile.snapshotDate;
    if (!mostRecentDate) {
      return [];
    }
    
    const recentSnapshots = await this.getSnapshotsByDateRange(
      new Date(mostRecentDate), 
      new Date(mostRecentDate)
    );
    
    for (const snapshot of recentSnapshots) {
      if (snapshot.stage && 
          !snapshot.stage.includes('Closed Won') && 
          !snapshot.stage.includes('Closed Lost') && 
          !snapshot.stage.includes('Validation/Introduction') &&
          snapshot.expectedCloseDate) {
        
        const fiscalQuarter = getFiscalQuarter(new Date(snapshot.expectedCloseDate));
        const currentValue = fiscalQuarterMap.get(fiscalQuarter) || 0;
        fiscalQuarterMap.set(fiscalQuarter, currentValue + (snapshot.amount || 0));
      }
    }

    return Array.from(fiscalQuarterMap.entries())
      .map(([fiscalQuarter, value]) => ({ fiscalQuarter, value }))
      .sort((a, b) => a.fiscalQuarter.localeCompare(b.fiscalQuarter));
  }

  async getMonthlyPipeline(): Promise<Array<{ month: string; value: number }>> {
    const monthlyMap = new Map<string, number>();
    
    // Helper function to get month-year string from a date
    const getMonthYear = (date: Date): string => {
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      return `${month} ${year}`;
    };
    
    // Get latest snapshot for each opportunity
    const opportunityIds = new Set(Array.from(this.snapshots.values()).map(s => s.opportunityId));
    
    for (const oppId of opportunityIds) {
      if (oppId) {
        const latestSnapshot = await this.getLatestSnapshotByOpportunity(oppId);
        if (latestSnapshot && 
            latestSnapshot.stage && 
            !latestSnapshot.stage.includes('Closed Won') && 
            !latestSnapshot.stage.includes('Closed Lost') && 
            !latestSnapshot.stage.includes('Validation/Introduction') &&
            latestSnapshot.expectedCloseDate) {
          
          const monthYear = getMonthYear(new Date(latestSnapshot.expectedCloseDate));
          const currentValue = monthlyMap.get(monthYear) || 0;
          monthlyMap.set(monthYear, currentValue + (latestSnapshot.amount || 0));
        }
      }
    }

    return Array.from(monthlyMap.entries())
      .map(([month, value]) => ({ month, value }))
      .sort((a, b) => {
        // Sort by date for proper chronological order
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
      });
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
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const movements: Array<{ 
      opportunityName: string; 
      from: string; 
      to: string; 
      date: Date; 
      value: number;
      opportunityId: string;
      clientName?: string;
    }> = [];

    // Group snapshots by opportunity
    const snapshotsByOpp = new Map<number, Snapshot[]>();
    for (const snapshot of this.snapshots.values()) {
      if (snapshot.opportunityId) {
        if (!snapshotsByOpp.has(snapshot.opportunityId)) {
          snapshotsByOpp.set(snapshot.opportunityId, []);
        }
        snapshotsByOpp.get(snapshot.opportunityId)!.push(snapshot);
      }
    }

    // Analyze movements for each opportunity
    for (const [oppId, snapshots] of snapshotsByOpp.entries()) {
      const sortedSnapshots = snapshots.sort((a, b) => 
        new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
      );

      const opportunity = await this.getOpportunity(oppId);
      
      for (let i = 1; i < sortedSnapshots.length; i++) {
        const current = sortedSnapshots[i];
        const previous = sortedSnapshots[i - 1];
        
        // Only track movements that represent meaningful stage changes
        const isValidMovement = new Date(current.snapshotDate) >= cutoffDate && 
            current.stage !== previous.stage &&
            current.stage && previous.stage &&
            // Don't track any movements FROM closed stages (deals shouldn't reopen from closed)
            !previous.stage.includes('Closed') &&
            // Don't track movements TO the same closed stage
            !(current.stage.includes('Closed') && current.stage === previous.stage);
            
        if (isValidMovement) {
          movements.push({
            opportunityName: opportunity?.name || 'Unknown',
            from: previous.stage,
            to: current.stage,
            date: new Date(current.snapshotDate),
            value: current.amount || 0,
            opportunityId: opportunity?.opportunityId || 'Unknown',
            clientName: opportunity?.clientName || undefined
          });
        }
      }
    }

    return movements.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async getStageTimingData(): Promise<Array<{ stage: string; avgDays: number; dealCount: number }>> {
    // Group snapshots by opportunity and sort by snapshot date
    const opportunitySnapshots = new Map<number, Snapshot[]>();
    
    Array.from(this.snapshots.values()).forEach(snapshot => {
      if (snapshot.opportunityId) {
        if (!opportunitySnapshots.has(snapshot.opportunityId)) {
          opportunitySnapshots.set(snapshot.opportunityId, []);
        }
        opportunitySnapshots.get(snapshot.opportunityId)!.push(snapshot);
      }
    });

    // Sort snapshots by date for each opportunity
    opportunitySnapshots.forEach(snapshots => {
      snapshots.sort((a, b) => new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime());
    });

    // Track stage durations for actual stage transitions
    const stageTimings = new Map<string, { totalDays: number; count: number }>();

    for (const [opportunityId, snapshots] of opportunitySnapshots) {
      // Only consider opportunities with multiple snapshots
      if (snapshots.length < 2) continue;

      // Track stage entry and exit points
      let currentStageStart: Date | null = null;
      let currentStage: string | null = null;

      for (let i = 0; i < snapshots.length; i++) {
        const snapshot = snapshots[i];
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
            }
          }

          // Start tracking the new stage
          currentStage = snapshot.stage;
          currentStageStart = snapshotDate;
        }
      }

      // Handle the final stage if the deal is still active
      // For the last stage, we can't calculate duration since we don't know when it will end
      // So we only track completed stage transitions
    }

    // Calculate averages and format results
    return Array.from(stageTimings.entries())
      .map(([stage, timing]) => ({
        stage,
        avgDays: timing.totalDays / timing.count,
        dealCount: timing.count
      }))
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
    // Group snapshots by opportunity and sort by snapshot date
    const opportunitySnapshots = new Map<number, Snapshot[]>();
    
    Array.from(this.snapshots.values()).forEach(snapshot => {
      if (snapshot.opportunityId && snapshot.expectedCloseDate) {
        if (!opportunitySnapshots.has(snapshot.opportunityId)) {
          opportunitySnapshots.set(snapshot.opportunityId, []);
        }
        opportunitySnapshots.get(snapshot.opportunityId)!.push(snapshot);
      }
    });

    // Sort snapshots by date for each opportunity
    opportunitySnapshots.forEach(snapshots => {
      snapshots.sort((a, b) => new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime());
    });

    // Analyze slippage by stage for closed deals only
    const stageSlippageData = new Map<string, {
      slippages: number[];
      values: number[];
      quarterEndDeals: number;
      quarterEndSlipped: number;
      worstCase: { opportunityName: string; slippageDays: number; value: number } | null;
    }>();

    for (const [opportunityId, snapshots] of opportunitySnapshots) {
      // Need at least 2 snapshots to detect slippage
      if (snapshots.length < 2) continue;

      const firstSnapshot = snapshots[0];
      const latestSnapshot = snapshots[snapshots.length - 1];

      // Only analyze closed deals (won or lost)
      if (!latestSnapshot.stage?.includes('Closed Won') && !latestSnapshot.stage?.includes('Closed Lost')) {
        continue;
      }

      // Only consider if both have expected close dates
      if (!firstSnapshot.expectedCloseDate || !latestSnapshot.expectedCloseDate) continue;

      const originalDate = new Date(firstSnapshot.expectedCloseDate);
      const currentDate = new Date(latestSnapshot.expectedCloseDate);
      const slippageDays = Math.round((currentDate.getTime() - originalDate.getTime()) / (1000 * 60 * 60 * 24));

      // Get the stage before closing (second to last snapshot or first if only 2 snapshots)
      const stageBeforeClose = snapshots.length > 2 ? snapshots[snapshots.length - 2].stage : firstSnapshot.stage;
      const stageName = stageBeforeClose || 'Unknown';

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
      stageData.values.push(latestSnapshot.amount || 0);

      // Check if original date was at quarter end (last month of fiscal quarter)
      const fiscalQuarter = this.getFiscalQuarter(originalDate);
      const isQuarterEnd = this.isQuarterEndMonth(originalDate);
      
      if (isQuarterEnd) {
        stageData.quarterEndDeals++;
        const originalQuarter = this.getFiscalQuarter(originalDate);
        const actualQuarter = this.getFiscalQuarter(currentDate);
        if (originalQuarter !== actualQuarter) {
          stageData.quarterEndSlipped++;
        }
      }

      // Track worst case slippage
      if (slippageDays > 0 && (!stageData.worstCase || slippageDays > stageData.worstCase.slippageDays)) {
        const opportunity = await this.getOpportunity(opportunityId);
        stageData.worstCase = {
          opportunityName: opportunity?.name || 'Unknown',
          slippageDays,
          value: latestSnapshot.amount || 0
        };
      }
    }

    // Calculate aggregated metrics by stage
    const results: Array<{
      stageName: string;
      avgSlippageDays: number;
      dealCount: number;
      quarterEndSlippageRate: number;
      totalSlippedValue: number;
      worstCase: { opportunityName: string; slippageDays: number; value: number } | null;
    }> = [];

    for (const [stageName, data] of stageSlippageData) {
      if (data.slippages.length === 0) continue;

      const avgSlippageDays = data.slippages.reduce((sum, days) => sum + days, 0) / data.slippages.length;
      const quarterEndSlippageRate = data.quarterEndDeals > 0 ? 
        (data.quarterEndSlipped / data.quarterEndDeals) * 100 : 0;
      const totalSlippedValue = data.values.reduce((sum, value) => sum + value, 0);

      results.push({
        stageName,
        avgSlippageDays: Math.round(avgSlippageDays * 10) / 10, // Round to 1 decimal
        dealCount: data.slippages.length,
        quarterEndSlippageRate: Math.round(quarterEndSlippageRate * 10) / 10,
        totalSlippedValue,
        worstCase: data.worstCase
      });
    }

    return results.sort((a, b) => b.avgSlippageDays - a.avgSlippageDays);
  }

  private getFiscalQuarter(date: Date): string {
    const fiscalYear = date.getMonth() >= 1 ? date.getFullYear() : date.getFullYear() - 1;
    const fiscalMonth = date.getMonth() >= 1 ? date.getMonth() - 1 : date.getMonth() + 11;
    const quarter = Math.floor(fiscalMonth / 3) + 1;
    return `FY${fiscalYear.toString().slice(-2)}Q${quarter}`;
  }

  private isQuarterEndMonth(date: Date): boolean {
    const fiscalMonth = date.getMonth() >= 1 ? date.getMonth() - 1 : date.getMonth() + 11;
    // Quarter end months in fiscal calendar: 3, 6, 9, 0 (April, July, October, January)
    return fiscalMonth === 3 || fiscalMonth === 6 || fiscalMonth === 9 || fiscalMonth === 0;
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
    console.log('🔍 Starting validation analysis...');
    
    const allSnapshots = Array.from(this.snapshots.values());
    const allOpportunities = Array.from(this.opportunities.values());
    
    // Identify validation stages (case-insensitive)
    const validationStages = new Set(['validation', 'introduction', 'validation/introduction']);
    
    // Get current validation opportunities (latest snapshots in validation stages)
    const currentValidationOpps = [];
    const opportunityGroups = new Map();
    
    // Group snapshots by opportunity
    for (const snapshot of allSnapshots) {
      if (!snapshot.opportunityId) continue;
      
      if (!opportunityGroups.has(snapshot.opportunityId)) {
        opportunityGroups.set(snapshot.opportunityId, []);
      }
      opportunityGroups.get(snapshot.opportunityId).push(snapshot);
    }
    
    let totalValidationValue = 0;
    let totalValidationCount = 0;
    
    // Find current validation opportunities
    for (const [opportunityId, snapshots] of opportunityGroups) {
      // Sort by snapshot date descending to get latest
      snapshots.sort((a: any, b: any) => new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime());
      const latestSnapshot = snapshots[0];
      
      if (!latestSnapshot.stage) continue;
      
      const stage = latestSnapshot.stage.toLowerCase();
      if (validationStages.has(stage) || stage.includes('validation') || stage.includes('introduction')) {
        const opportunity = allOpportunities.find(o => o.id === opportunityId);
        if (opportunity) {
          const value = latestSnapshot.year1Value || latestSnapshot.amount || 0;
          const firstValidationSnapshot = snapshots
            .filter((s: any) => {
              const sStage = s.stage?.toLowerCase() || '';
              return validationStages.has(sStage) || sStage.includes('validation') || sStage.includes('introduction');
            })
            .sort((a: any, b: any) => new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime())[0];
          
          const daysInValidation = firstValidationSnapshot 
            ? Math.floor((new Date().getTime() - new Date(firstValidationSnapshot.snapshotDate).getTime()) / (1000 * 60 * 60 * 24))
            : 0;
          
          currentValidationOpps.push({
            opportunityName: opportunity.name,
            clientName: opportunity.clientName,
            value: value,
            daysInValidation: daysInValidation,
            stage: latestSnapshot.stage
          });
          
          totalValidationValue += value;
          totalValidationCount++;
        }
      }
    }
    
    // Calculate conversion rates by analyzing historical data
    const stageConversions = new Map();
    let totalConverted = 0;
    let totalClosedLost = 0;
    
    // Analyze conversion patterns
    for (const [opportunityId, snapshots] of opportunityGroups) {
      snapshots.sort((a: any, b: any) => new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime());
      
      let wasInValidation = false;
      let validationStage = '';
      
      for (let i = 0; i < snapshots.length; i++) {
        const snapshot = snapshots[i];
        const stage = snapshot.stage?.toLowerCase() || '';
        
        // Check if currently in validation
        if (validationStages.has(stage) || stage.includes('validation') || stage.includes('introduction')) {
          wasInValidation = true;
          validationStage = snapshot.stage || 'validation';
        }
        
        // Check for transition out of validation
        if (wasInValidation && !(validationStages.has(stage) || stage.includes('validation') || stage.includes('introduction'))) {
          // Initialize stage tracking
          if (!stageConversions.has(validationStage)) {
            stageConversions.set(validationStage, {
              toLaterStage: 0,
              toClosedLost: 0,
              total: 0
            });
          }
          
          const conversion = stageConversions.get(validationStage);
          conversion.total++;
          
          if (stage.includes('closed') && stage.includes('lost')) {
            conversion.toClosedLost++;
            totalClosedLost++;
          } else {
            conversion.toLaterStage++;
            totalConverted++;
          }
          
          wasInValidation = false;
          break;
        }
      }
    }
    
    // Build stage breakdown
    const stageBreakdown = [];
    for (const [stageName, data] of stageConversions) {
      const conversionRate = data.total > 0 ? (data.toLaterStage / data.total) * 100 : 0;
      stageBreakdown.push({
        fromStage: stageName,
        toLaterStage: data.toLaterStage,
        toClosedLost: data.toClosedLost,
        totalDeals: data.total,
        conversionRate: conversionRate
      });
    }
    
    const avgValidationDealSize = totalValidationCount > 0 ? totalValidationValue / totalValidationCount : 0;
    const totalConverted_ClosedLost = totalConverted + totalClosedLost;
    const conversionRate = totalConverted_ClosedLost > 0 ? (totalConverted / totalConverted_ClosedLost) * 100 : 0;
    
    // Sort validation opportunities by value descending
    currentValidationOpps.sort((a, b) => b.value - a.value);
    
    console.log(`🔍 Validation analysis complete: ${totalValidationCount} active validation deals, ${conversionRate.toFixed(1)}% conversion rate`);
    
    return {
      totalValidationValue,
      totalValidationCount,
      avgValidationDealSize,
      conversionToLaterStage: totalConverted,
      conversionToClosedLost: totalClosedLost,
      conversionRate,
      stageBreakdown,
      topValidationOpportunities: currentValidationOpps.slice(0, 10)
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
    // Get all snapshots for closed deals only
    const allSnapshots = Array.from(this.snapshots.values());
    const closedSnapshots = allSnapshots.filter(s => 
      s.stage === 'Closed Won' || s.stage === 'Closed Lost'
    );

    if (closedSnapshots.length === 0) {
      return [];
    }

    // Group by opportunity to get the final outcome for each deal
    const dealOutcomes = new Map<number, string>();
    for (const snapshot of closedSnapshots) {
      if (snapshot.opportunityId) {
        dealOutcomes.set(snapshot.opportunityId, snapshot.stage);
      }
    }

    // Get all snapshots for deals that eventually closed
    const closedOpportunityIds = new Set(dealOutcomes.keys());
    const relevantSnapshots = allSnapshots.filter(s => 
      s.opportunityId && closedOpportunityIds.has(s.opportunityId)
    );

    // Group snapshots by stage to analyze win rates
    const stageAnalysis = new Map<string, {
      deals: Set<number>;
      won: Set<number>;
      lost: Set<number>;
    }>();

    const stages = [
      'Validation/Introduction',
      'Discover',
      'Developing Champions', 
      'ROI Analysis/Pricing',
      'Negotiation/Review'
    ];

    // Initialize stage analysis
    for (const stage of stages) {
      stageAnalysis.set(stage, {
        deals: new Set(),
        won: new Set(),
        lost: new Set()
      });
    }

    // Analyze each deal's journey
    for (const [opportunityId, finalOutcome] of dealOutcomes.entries()) {
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
      for (const stage of stagesVisited) {
        const analysis = stageAnalysis.get(stage);
        if (analysis) {
          analysis.deals.add(opportunityId);
          if (finalOutcome === 'Closed Won') {
            analysis.won.add(opportunityId);
          } else {
            analysis.lost.add(opportunityId);
          }
        }
      }
    }

    // Calculate probabilities
    const results = [];
    for (const stage of stages) {
      const analysis = stageAnalysis.get(stage);
      if (analysis && analysis.deals.size > 0) {
        const totalDeals = analysis.deals.size;
        const closedWon = analysis.won.size;
        const closedLost = analysis.lost.size;
        const winRate = (closedWon / totalDeals) * 100;

        results.push({
          stage,
          totalDeals,
          closedWon,
          closedLost,
          winRate,
          conversionToNext: winRate // For now, using win rate as conversion
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
      latestSnapshot?: {
        stage: string;
        amount: number;
      };
    }>;
    totalValue: number;
  }>> {
    let targetDate = new Date();
    if (endDate) {
      targetDate = new Date(endDate);
    }

    // Find the uploaded file closest to the target date
    const files = Array.from(this.uploadedFiles.values());
    if (files.length === 0) {
      return [];
    }

    const targetFile = files
      .filter(file => file.snapshotDate && new Date(file.snapshotDate) <= targetDate)
      .sort((a, b) => {
        const dateA = a.snapshotDate ? new Date(a.snapshotDate).getTime() : 0;
        const dateB = b.snapshotDate ? new Date(b.snapshotDate).getTime() : 0;
        return dateB - dateA; // Most recent first
      })[0];

    if (!targetFile || !targetFile.snapshotDate) {
      return [];
    }

    console.log(`🔍 Finding duplicates from file: ${targetFile.filename} (${new Date(targetFile.snapshotDate).toDateString()})`);

    // Get all snapshots from the target file date
    const targetSnapshots = Array.from(this.snapshots.values())
      .filter(snapshot => {
        const snapshotDate = new Date(snapshot.snapshotDate);
        const fileDate = new Date(targetFile.snapshotDate!);
        return Math.abs(snapshotDate.getTime() - fileDate.getTime()) < 24 * 60 * 60 * 1000; // Within 24 hours
      });

    console.log(`🔍 Found ${targetSnapshots.length} snapshots from target date`);
    console.log(`🔍 Sample snapshots:`, targetSnapshots.slice(0, 3).map(s => ({
      opportunityId: s.opportunityId,
      stage: s.stage,
      snapshotDate: s.snapshotDate
    })));

    // Get opportunities with latest snapshots from the target date
    const opportunityMap = new Map<number, {
      opportunity: any;
      snapshot: any;
    }>();

    for (const snapshot of targetSnapshots) {
      if (snapshot.opportunityId) {
        const opportunity = await this.getOpportunity(snapshot.opportunityId);
        if (opportunity && opportunity.clientName) {
          opportunityMap.set(snapshot.opportunityId, {
            opportunity,
            snapshot
          });
        }
      }
    }

    // Group by client name and find duplicates
    const clientGroups = new Map<string, Array<{
      id: number;
      name: string;
      opportunityId: string;
      owner?: string;
      latestSnapshot?: {
        stage: string;
        amount: number;
      };
    }>>();

    for (const { opportunity, snapshot } of opportunityMap.values()) {
      const clientName = opportunity.clientName.trim();
      if (!clientGroups.has(clientName)) {
        clientGroups.set(clientName, []);
      }

      clientGroups.get(clientName)!.push({
        id: opportunity.id,
        name: opportunity.name,
        opportunityId: opportunity.opportunityId,
        owner: opportunity.owner || undefined,
        latestSnapshot: {
          stage: snapshot.stage || 'Unknown',
          amount: snapshot.amount || 0
        }
      });
    }

    console.log(`🔍 Grouped into ${clientGroups.size} unique client names`);
    console.log(`🔍 Client group sizes:`, Array.from(clientGroups.entries()).map(([name, opps]) => ({ name, count: opps.length })).slice(0, 10));

    // Filter to only clients with multiple opportunities (duplicates)
    const duplicateGroups = Array.from(clientGroups.entries())
      .filter(([_, opps]) => opps.length > 1)
      .map(([clientName, allOpportunities]) => {
        // Show only active opportunities (exclude Closed Won, Closed Lost, Validation/Introduction)
        const activeOpportunities = allOpportunities.filter(opp => {
          const stage = opp.latestSnapshot?.stage?.toLowerCase() || '';
          const isActive = !stage.includes('closed') && 
                          !stage.includes('validation') && 
                          !stage.includes('introduction');
          
          if (!isActive && allOpportunities.length > 1) {
            console.log(`🚫 Filtering out ${opp.name} (${opp.opportunityId}) - stage: ${stage}`);
          }
          
          return isActive;
        });

        if (allOpportunities.length > 1) {
          console.log(`📋 Client "${clientName}": ${allOpportunities.length} total opportunities, ${activeOpportunities.length} active`);
          if (activeOpportunities.length > 0) {
            console.log(`   Active stages: ${activeOpportunities.map(o => o.latestSnapshot?.stage).join(', ')}`);
          }
        }

        // Add isActive flag to all opportunities
        const opportunitiesWithStatus = allOpportunities.map(opp => {
          const stage = opp.latestSnapshot?.stage?.toLowerCase() || '';
          const isActive = !stage.includes('closed') && 
                          !stage.includes('validation') && 
                          !stage.includes('introduction');
          return { ...opp, isActive };
        });

        return {
          clientName,
          opportunities: opportunitiesWithStatus, // Include all opportunities with status
          totalValue: activeOpportunities.reduce((sum, opp) => 
            sum + (opp.latestSnapshot?.amount || 0), 0
          ),
          totalOpportunitiesCount: allOpportunities.length,
          activeOpportunitiesCount: activeOpportunities.length
        };
      })
      .filter(group => group.totalOpportunitiesCount > 1 && group.activeOpportunitiesCount > 0) // Only show groups with multiple opportunities AND at least one active
      .sort((a, b) => b.totalValue - a.totalValue);

    console.log(`🔍 Found ${duplicateGroups.length} duplicate groups from ${targetFile.filename}`);
    return duplicateGroups;
  }

  async getStageMappings(): Promise<Array<{ from: string; to: string }>> {
    return [...this.stageMappings];
  }

  async setStageMappings(mappings: Array<{ from: string; to: string }>): Promise<void> {
    this.stageMappings = [...mappings];
  }

  async getProbabilityConfigs(): Promise<Array<{ stage: string; confidence: string; probability: number }>> {
    return [...this.probabilityConfigs];
  }

  async setProbabilityConfigs(configs: Array<{ stage: string; confidence: string; probability: number }>): Promise<void> {
    this.probabilityConfigs = [...configs];
  }

  async getLossReasonAnalysis(): Promise<Array<{
    reason: string;
    count: number;
    totalValue: number;
    percentage: number;
  }>> {
    const query = `
      WITH latest_snapshots AS (
        SELECT DISTINCT ON (opportunity_id) 
          opportunity_id,
          stage,
          amount,
          loss_reason,
          snapshot_date
        FROM snapshots 
        ORDER BY opportunity_id, snapshot_date DESC
      ),
      closed_lost_deals AS (
        SELECT 
          loss_reason,
          COUNT(*) as count,
          SUM(amount) as total_value
        FROM latest_snapshots
        WHERE stage = 'Closed Lost' 
          AND loss_reason IS NOT NULL 
          AND loss_reason != ''
        GROUP BY loss_reason
      ),
      total_closed_lost AS (
        SELECT COUNT(*) as total_count
        FROM latest_snapshots
        WHERE stage = 'Closed Lost'
      )
      SELECT 
        cld.loss_reason as reason,
        cld.count::int,
        cld.total_value::float,
        ROUND((cld.count::float / tcl.total_count::float * 100), 1) as percentage
      FROM closed_lost_deals cld
      CROSS JOIN total_closed_lost tcl
      ORDER BY cld.count DESC, cld.total_value DESC
    `;

    try {
      const result = await this.db.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error in getLossReasonAnalysis:', error);
      return [];
    }
  }

  async clearAllData(): Promise<void> {
    this.opportunities.clear();
    this.snapshots.clear();
    this.uploadedFiles.clear();
    this.currentOpportunityId = 1;
    this.currentSnapshotId = 1;
    this.currentFileId = 1;
  }
}

// Re-export everything from the new PostgreSQL storage
export * from './storage-pg.js';
