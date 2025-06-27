import { and, eq, sql } from 'drizzle-orm';
import { db } from './db';
import { opportunities, snapshots } from '../shared/schema';

/**
 * Sales Analytics Storage Interface
 * Provides sales-specific analytics with filtering capabilities
 */
export interface ISalesStorage {
  // Sales rep and client lookups
  getSalesRepsList(): Promise<Array<{ owner: string; count: number }>>;
  getClientsList(): Promise<Array<{ clientName: string; count: number }>>;

  // Sales-filtered analytics methods
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

/**
 * PostgreSQL Sales Analytics Storage Implementation
 * Handles all sales-specific analytics queries with optional sales rep filtering
 */
export class PostgreSQLSalesStorage implements ISalesStorage {
  
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
    // Use the same logic as the original getFiscalYearPipeline but with sales rep filtering
    // Get the most recent snapshot date
    const latestDateResult = await db
      .select({ maxDate: sql<string>`MAX(${snapshots.snapshotDate})::date::text` })
      .from(snapshots);
    
    const latestDateStr = latestDateResult[0]?.maxDate;
    
    if (!latestDateStr) {
      return [];
    }
    
    console.log(`🗓️ Using latest snapshot date for sales fiscal year pipeline: ${latestDateStr}`);
    
    let whereConditions = [
      sql`${snapshots.stage} IS NOT NULL`,
      sql`${snapshots.stage} NOT LIKE '%Closed%'`,
      sql`${snapshots.stage} NOT LIKE '%Validation%'`,
      sql`${snapshots.snapshotDate}::date = ${latestDateStr}::date`,
      sql`${snapshots.expectedCloseDate} IS NOT NULL`
    ];

    // Add sales rep filter if specified
    if (filters.salesRep && filters.salesRep !== 'all') {
      whereConditions.push(eq(opportunities.owner, filters.salesRep));
    }

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
      .innerJoin(opportunities, eq(snapshots.opportunityId, opportunities.id))
      .where(and(...whereConditions))
      .groupBy(sql`
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
      sql`${snapshots.stage} IS NOT NULL`,
      sql`${snapshots.stage} NOT LIKE '%Closed%'`,
      sql`${snapshots.stage} NOT LIKE '%Validation%'`,
      sql`${snapshots.snapshotDate}::date = ${latestDateStr}::date`,
      sql`${snapshots.expectedCloseDate} IS NOT NULL`
    ];

    // Add sales rep filter if specified
    if (filters.salesRep && filters.salesRep !== 'all') {
      whereConditions.push(eq(opportunities.owner, filters.salesRep));
    }

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
      .innerJoin(opportunities, eq(snapshots.opportunityId, opportunities.id))
      .where(and(...whereConditions))
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
      sql`${snapshots.stage} IS NOT NULL`,
      sql`${snapshots.stage} NOT LIKE '%Closed%'`,
      sql`${snapshots.stage} NOT LIKE '%Validation%'`,
      sql`${snapshots.snapshotDate}::date = ${latestDateStr}::date`,
      sql`${snapshots.expectedCloseDate} IS NOT NULL`
    ];

    // Add sales rep filter if specified
    if (filters.salesRep && filters.salesRep !== 'all') {
      whereConditions.push(eq(opportunities.owner, filters.salesRep));
    }

    const result = await db
      .select({
        month: sql<string>`TO_CHAR(${snapshots.expectedCloseDate}, 'YYYY-MM')`,
        value: sql<number>`SUM(COALESCE(${snapshots.year1Value}, 0))`
      })
      .from(snapshots)
      .innerJoin(opportunities, eq(snapshots.opportunityId, opportunities.id))
      .where(and(...whereConditions))
      .groupBy(sql`TO_CHAR(${snapshots.expectedCloseDate}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${snapshots.expectedCloseDate}, 'YYYY-MM')`);
    
    return result.map(r => ({
      month: r.month || 'Unknown',
      value: Number(r.value) || 0
    }));
  }

  async getSalesStageTimingData(filters: any): Promise<Array<{ stage: string; avgDays: number; dealCount: number }>> {
    // Placeholder - delegates to main timing analysis
    return [];
  }

  async getSalesDateSlippageData(filters: any): Promise<Array<any>> {
    // Placeholder - delegates to main slippage analysis
    return [];
  }

  async getSalesDuplicateOpportunities(filters: any): Promise<Array<any>> {
    // Placeholder - delegates to main duplicate analysis
    return [];
  }

  async getSalesValueChanges(filters: any): Promise<Array<any>> {
    // Placeholder - delegates to main value changes analysis
    return [];
  }

  async getSalesClosingProbabilityData(filters: any): Promise<Array<any>> {
    // Placeholder - delegates to main closing probability analysis
    return [];
  }

  async getSalesStageFunnel(filters: any): Promise<Array<any>> {
    // This delegates to main stage distribution with filtering
    const stageDistribution = await this.getSalesStageDistribution(filters);
    
    // Transform stage distribution into funnel format
    const stageOrder = ['Validation/Introduction', 'Discover', 'Developing Champions', 'ROI Analysis/Pricing', 'Negotiation/Review'];
    const funnel = stageOrder.map(stageName => {
      const stage = stageDistribution.find(s => s.stage === stageName);
      return {
        stage: stageName,
        count: stage?.count || 0,
        value: stage?.value || 0,
        conversionRate: 0 // Would need previous stage data to calculate
      };
    }).filter(s => s.count > 0);
    
    return funnel;
  }

  async getSalesWinRateAnalysis(filters: any): Promise<any> {
    // Placeholder - would delegate to main win rate analysis with filtering
    return { winRate: 0, dealsClosed: 0, dealsWon: 0 };
  }

  async getSalesCloseRateAnalysis(filters: any): Promise<any> {
    // Placeholder - would delegate to main close rate analysis with filtering
    return { closeRate: 0, totalDeals: 0, closedDeals: 0 };
  }

  async getSalesLossReasons(filters: any): Promise<Array<any>> {
    // Placeholder - would delegate to main loss reasons analysis with filtering
    return [];
  }

  async getSalesOpportunities(filters: any): Promise<Array<any>> {
    // This would return filtered opportunities based on sales rep and other criteria
    let whereConditions = [
      sql`${opportunities.name} IS NOT NULL`
    ];

    // Add sales rep filter if specified
    if (filters.salesRep && filters.salesRep !== 'all') {
      whereConditions.push(eq(opportunities.owner, filters.salesRep));
    }

    // Add client filter if specified
    if (filters.client && filters.client !== 'all') {
      whereConditions.push(eq(opportunities.clientName, filters.client));
    }

    // Get opportunities with their latest snapshots
    const result = await db
      .select({
        id: opportunities.id,
        name: opportunities.name,
        opportunityId: opportunities.opportunityId,
        clientName: opportunities.clientName,
        owner: opportunities.owner,
        createdDate: opportunities.createdDate
      })
      .from(opportunities)
      .where(and(...whereConditions))
      .orderBy(opportunities.name)
      .limit(100); // Add reasonable limit for performance

    return result.map(opp => ({
      id: opp.id,
      name: opp.name || '',
      opportunityId: opp.opportunityId || '',
      clientName: opp.clientName || '',
      owner: opp.owner || '',
      createdDate: opp.createdDate,
      isActive: true // Default to active since field doesn't exist in schema
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
}

// Export the singleton instance
export const salesStorage = new PostgreSQLSalesStorage();