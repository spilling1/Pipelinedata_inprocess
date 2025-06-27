import { db } from './db';
import { opportunities, snapshots } from '../shared/schema';
import { eq, and, desc, asc, sql, ne, or, inArray, isNull, isNotNull, gte, lte } from 'drizzle-orm';

/**
 * Core Analytics Storage Interface
 * Handles complex analytics calculations for pipeline analysis
 */
export interface IAnalyticsStorage {
  // Core pipeline analytics
  getPipelineValueByDate(startDate?: string, endDate?: string): Promise<Array<{ date: Date; value: number }>>;
  getStageDistribution(): Promise<Array<{ stage: string; count: number; value: number }>>;
  getYear1ArrDistribution(): Promise<Array<{ stage: string; count: number; value: number }>>;
  getFiscalYearPipeline(): Promise<Array<{ fiscalYear: string; value: number }>>;
  getFiscalQuarterPipeline(): Promise<Array<{ fiscalQuarter: string; value: number }>>;
  getMonthlyPipeline(): Promise<Array<{ month: string; value: number }>>;

  // Deal movement and timing analytics
  getDealMovements(days: number): Promise<Array<{ 
    opportunityName: string; 
    from: string; 
    to: string; 
    date: Date; 
    value: number 
  }>>;
  getStageTimingData(startDate?: string, endDate?: string): Promise<Array<{ stage: string; avgDays: number; dealCount: number }>>;

  // Advanced analytics
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

  getClosingProbabilityData(startDate?: string, endDate?: string): Promise<Array<{
    stage: string;
    totalDeals: number;
    closedWon: number;
    closedLost: number;
    winRate: number;
    conversionToNext: number;
  }>>;

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

  // Stage analysis methods
  getStageSlippageAnalysis(startDate?: Date, endDate?: Date): Promise<Array<{
    stageName: string;
    avgSlippageDays: number;
    opportunityCount: number;
    totalSlippageDays: number;
  }>>;

  getQuarterRetentionAnalysis(startDate?: Date, endDate?: Date): Promise<Array<{
    stageName: string;
    totalOpportunities: number;
    sameQuarterClosures: number;
    retentionRate: number;
  }>>;

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

  // Loss analysis methods
  getLossReasonAnalysis(startDate?: string, endDate?: string): Promise<Array<{
    reason: string;
    count: number;
    totalValue: number;
    percentage: number;
  }>>;
  
  getLossReasonByPreviousStage(startDate?: string, endDate?: string): Promise<Array<{
    reason: string;
    previousStage: string;
    count: number;
    totalValue: number;
    percentage: number;
  }>>;

  getRecentLosses(limit?: number): Promise<Array<{
    opportunityName: string;
    clientName?: string;
    lossReason: string;
    year1Value: number;
    closeDate: string;
    previousStage: string;
  }>>;

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
}

/**
 * PostgreSQL Core Analytics Storage Implementation
 * Handles complex analytics calculations with optimized database queries
 */
export class PostgreSQLAnalyticsStorage implements IAnalyticsStorage {

  async getPipelineValueByDate(startDate?: string, endDate?: string): Promise<Array<{ date: Date; value: number }>> {
    let whereConditions = [
      sql`${snapshots.stage} NOT LIKE '%Closed%'`,
      sql`${snapshots.stage} NOT LIKE '%Validation%'`,
      sql`${snapshots.year1Value} > 0`
    ];

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
    
    // Only count opportunities from the most recent snapshot date
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
    
    const result = await db
      .select({
        fiscalYear: sql<string>`
          'FY' || 
          CASE 
            WHEN EXTRACT(MONTH FROM ${snapshots.expectedCloseDate}) IN (2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12) THEN EXTRACT(YEAR FROM ${snapshots.expectedCloseDate} + INTERVAL '1 year')
            ELSE EXTRACT(YEAR FROM ${snapshots.expectedCloseDate})
          END
        `,
        value: sql<number>`SUM(COALESCE(${snapshots.year1Value}, 0))`
      })
      .from(snapshots)
      .where(and(
        sql`${snapshots.stage} IS NOT NULL`,
        sql`${snapshots.stage} NOT LIKE '%Closed%'`,
        sql`${snapshots.stage} NOT LIKE '%Validation%'`,
        sql`${snapshots.snapshotDate}::date = ${latestDateStr}::date`,
        sql`${snapshots.expectedCloseDate} IS NOT NULL`
      ))
      .groupBy(sql`
        'FY' || 
        CASE 
          WHEN EXTRACT(MONTH FROM ${snapshots.expectedCloseDate}) IN (2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12) THEN EXTRACT(YEAR FROM ${snapshots.expectedCloseDate} + INTERVAL '1 year')
          ELSE EXTRACT(YEAR FROM ${snapshots.expectedCloseDate})
        END
      `)
      .orderBy(sql`
        CASE 
          WHEN EXTRACT(MONTH FROM ${snapshots.expectedCloseDate}) IN (2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12) THEN EXTRACT(YEAR FROM ${snapshots.expectedCloseDate} + INTERVAL '1 year')
          ELSE EXTRACT(YEAR FROM ${snapshots.expectedCloseDate})
        END
      `);
    
    return result.map(r => ({
      fiscalYear: r.fiscalYear || 'Unknown',
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
    
    const result = await db
      .select({
        fiscalQuarter: sql<string>`
          CASE 
            WHEN EXTRACT(MONTH FROM ${snapshots.expectedCloseDate}) IN (2, 3, 4) THEN 'Q1 FY' || EXTRACT(YEAR FROM ${snapshots.expectedCloseDate} + INTERVAL '1 year')
            WHEN EXTRACT(MONTH FROM ${snapshots.expectedCloseDate}) IN (5, 6, 7) THEN 'Q2 FY' || EXTRACT(YEAR FROM ${snapshots.expectedCloseDate} + INTERVAL '1 year')
            WHEN EXTRACT(MONTH FROM ${snapshots.expectedCloseDate}) IN (8, 9, 10) THEN 'Q3 FY' || EXTRACT(YEAR FROM ${snapshots.expectedCloseDate} + INTERVAL '1 year')
            WHEN EXTRACT(MONTH FROM ${snapshots.expectedCloseDate}) IN (11, 12, 1) THEN 'Q4 FY' || 
              CASE 
                WHEN EXTRACT(MONTH FROM ${snapshots.expectedCloseDate}) IN (11, 12) THEN EXTRACT(YEAR FROM ${snapshots.expectedCloseDate} + INTERVAL '1 year')
                ELSE EXTRACT(YEAR FROM ${snapshots.expectedCloseDate})
              END
            ELSE 'Unknown'
          END
        `,
        value: sql<number>`SUM(COALESCE(${snapshots.year1Value}, 0))`
      })
      .from(snapshots)
      .where(and(
        sql`${snapshots.stage} IS NOT NULL`,
        sql`${snapshots.stage} NOT LIKE '%Closed%'`,
        sql`${snapshots.stage} NOT LIKE '%Validation%'`,
        sql`${snapshots.snapshotDate}::date = ${latestDateStr}::date`,
        sql`${snapshots.expectedCloseDate} IS NOT NULL`
      ))
      .groupBy(sql`
        CASE 
          WHEN EXTRACT(MONTH FROM ${snapshots.expectedCloseDate}) IN (2, 3, 4) THEN 'Q1 FY' || EXTRACT(YEAR FROM ${snapshots.expectedCloseDate} + INTERVAL '1 year')
          WHEN EXTRACT(MONTH FROM ${snapshots.expectedCloseDate}) IN (5, 6, 7) THEN 'Q2 FY' || EXTRACT(YEAR FROM ${snapshots.expectedCloseDate} + INTERVAL '1 year')
          WHEN EXTRACT(MONTH FROM ${snapshots.expectedCloseDate}) IN (8, 9, 10) THEN 'Q3 FY' || EXTRACT(YEAR FROM ${snapshots.expectedCloseDate} + INTERVAL '1 year')
          WHEN EXTRACT(MONTH FROM ${snapshots.expectedCloseDate}) IN (11, 12, 1) THEN 'Q4 FY' || 
            CASE 
              WHEN EXTRACT(MONTH FROM ${snapshots.expectedCloseDate}) IN (11, 12) THEN EXTRACT(YEAR FROM ${snapshots.expectedCloseDate} + INTERVAL '1 year')
              ELSE EXTRACT(YEAR FROM ${snapshots.expectedCloseDate})
            END
          ELSE 'Unknown'
        END
      `)
      .orderBy(sql`
        CASE 
          WHEN EXTRACT(MONTH FROM ${snapshots.expectedCloseDate}) IN (2, 3, 4) THEN 'Q1 FY' || EXTRACT(YEAR FROM ${snapshots.expectedCloseDate} + INTERVAL '1 year')
          WHEN EXTRACT(MONTH FROM ${snapshots.expectedCloseDate}) IN (5, 6, 7) THEN 'Q2 FY' || EXTRACT(YEAR FROM ${snapshots.expectedCloseDate} + INTERVAL '1 year')
          WHEN EXTRACT(MONTH FROM ${snapshots.expectedCloseDate}) IN (8, 9, 10) THEN 'Q3 FY' || EXTRACT(YEAR FROM ${snapshots.expectedCloseDate} + INTERVAL '1 year')
          WHEN EXTRACT(MONTH FROM ${snapshots.expectedCloseDate}) IN (11, 12, 1) THEN 'Q4 FY' || 
            CASE 
              WHEN EXTRACT(MONTH FROM ${snapshots.expectedCloseDate}) IN (11, 12) THEN EXTRACT(YEAR FROM ${snapshots.expectedCloseDate} + INTERVAL '1 year')
              ELSE EXTRACT(YEAR FROM ${snapshots.expectedCloseDate})
            END
          ELSE 'Unknown'
        END
      `);
    
    return result.map(r => ({
      fiscalQuarter: r.fiscalQuarter || 'Unknown',
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
    
    const result = await db
      .select({
        month: sql<string>`TO_CHAR(${snapshots.expectedCloseDate}, 'YYYY-MM')`,
        value: sql<number>`SUM(COALESCE(${snapshots.year1Value}, 0))`
      })
      .from(snapshots)
      .where(and(
        sql`${snapshots.stage} IS NOT NULL`,
        sql`${snapshots.stage} NOT LIKE '%Closed%'`,
        sql`${snapshots.stage} NOT LIKE '%Validation%'`,
        sql`${snapshots.snapshotDate}::date = ${latestDateStr}::date`,
        sql`${snapshots.expectedCloseDate} IS NOT NULL`
      ))
      .groupBy(sql`TO_CHAR(${snapshots.expectedCloseDate}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${snapshots.expectedCloseDate}, 'YYYY-MM')`);
    
    return result.map(r => ({
      month: r.month || 'Unknown',
      value: Number(r.value) || 0
    }));
  }

  // Placeholder implementations for complex methods - these would need full implementations


  async getStageTimingData(startDate?: string, endDate?: string): Promise<Array<{ stage: string; avgDays: number; dealCount: number }>> {
    // Complex implementation would be needed to calculate timing between stages
    return [];
  }

  async getDateSlippageData(): Promise<Array<{ stageName: string; avgSlippageDays: number; dealCount: number; quarterEndSlippageRate: number; totalSlippedValue: number; worstCase: { opportunityName: string; slippageDays: number; value: number; } | null; }>> {
    // Complex slippage analysis would be implemented here
    return [];
  }

  async getValidationAnalysis(): Promise<{ totalValidationValue: number; totalValidationCount: number; avgValidationDealSize: number; conversionToLaterStage: number; conversionToClosedLost: number; conversionRate: number; stageBreakdown: any[]; topValidationOpportunities: any[]; }> {
    // Complex validation analysis would be implemented here
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

  async getClosingProbabilityData(startDate?: string, endDate?: string): Promise<Array<{ stage: string; totalDeals: number; closedWon: number; closedLost: number; winRate: number; conversionToNext: number; }>> {
    // Complex probability analysis would be implemented here
    return [];
  }

  async getDuplicateOpportunities(endDate?: string): Promise<Array<{ clientName: string; opportunities: any[]; totalValue: number; totalOpportunitiesCount: number; activeOpportunitiesCount: number; }>> {
    // Complex duplicate detection would be implemented here
    return [];
  }

  async getStageSlippageAnalysis(startDate?: Date, endDate?: Date): Promise<Array<{ stageName: string; avgSlippageDays: number; opportunityCount: number; totalSlippageDays: number; }>> {
    // Complex stage slippage analysis would be implemented here
    return [];
  }

  async getQuarterRetentionAnalysis(startDate?: Date, endDate?: Date): Promise<Array<{ stageName: string; totalOpportunities: number; sameQuarterClosures: number; retentionRate: number; }>> {
    // Complex quarter retention analysis would be implemented here
    return [];
  }

  async getValueChangesByStage(startDate?: Date, endDate?: Date): Promise<Array<{ fromStage: string; toStage: string; opportunityCount: number; avgYear1ArrChange: number; avgTotalContractValueChange: number; totalYear1ArrChange: number; totalContractValueChange: number; year1ArrChangePercentage: number; totalContractValueChangePercentage: number; }>> {
    // Complex value changes analysis would be implemented here
    return [];
  }

  async getLossReasonAnalysis(startDate?: string, endDate?: string): Promise<Array<{ reason: string; count: number; totalValue: number; percentage: number; }>> {
    // Complex loss reason analysis would be implemented here
    return [];
  }

  async getLossReasonByPreviousStage(startDate?: string, endDate?: string): Promise<Array<{ reason: string; previousStage: string; count: number; totalValue: number; percentage: number; }>> {
    // Complex loss reason by stage analysis would be implemented here
    return [];
  }

  async getRecentLosses(limit: number = 20): Promise<Array<{ opportunityName: string; clientName?: string; lossReason: string; year1Value: number; closeDate: string; previousStage: string; }>> {
    // Complex recent losses analysis would be implemented here
    return [];
  }

  async getClosedWonFYData(startDate?: string, endDate?: string): Promise<{ totalValue: number; totalCount: number; growth: number; deals: Array<{ opportunityName: string; clientName?: string; value: number; closeDate: Date; }>; }> {
    // Complex closed won fiscal year analysis would be implemented here
    return {
      totalValue: 0,
      totalCount: 0,
      growth: 0,
      deals: []
    };
  }
}

export const analyticsStorage = new PostgreSQLAnalyticsStorage();