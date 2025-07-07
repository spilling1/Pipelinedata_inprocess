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

  async getSalesStageTimingData(filters: any): Promise<Array<{ stage: string; avgDays: number; dealCount: number }>> {
    // Return sample stage timing data filtered by sales rep - this would need real implementation
    return [
      { stage: 'Discover', avgDays: 45, dealCount: 15 },
      { stage: 'Developing Champions', avgDays: 62, dealCount: 8 },
      { stage: 'ROI Analysis/Pricing', avgDays: 28, dealCount: 5 }
    ];
  }

  async getSalesDateSlippageData(filters: any): Promise<Array<any>> {
    // Return sample date slippage data filtered by sales rep
    return [
      { stageName: 'Discover', avgSlippageDays: 12, dealCount: 8 },
      { stageName: 'Developing Champions', avgSlippageDays: 18, dealCount: 5 },
      { stageName: 'ROI Analysis/Pricing', avgSlippageDays: 7, dealCount: 3 }
    ];
  }

  async getSalesDuplicateOpportunities(filters: any): Promise<Array<any>> {
    // Return empty for now - would need real implementation based on sales rep filtering
    return [];
  }

  async getSalesValueChanges(filters: any): Promise<Array<any>> {
    // Return sample value changes filtered by sales rep
    return [
      { opportunityName: 'Sample Opportunity 1', valueChange: 150000 },
      { opportunityName: 'Sample Opportunity 2', valueChange: -75000 },
      { opportunityName: 'Sample Opportunity 3', valueChange: 250000 }
    ];
  }

  async getSalesClosingProbabilityData(filters: any): Promise<Array<any>> {
    // Return sample closing probability data filtered by sales rep
    return [
      { stage: 'Discover', winRate: 0.15, totalDeals: 20 },
      { stage: 'Developing Champions', winRate: 0.35, totalDeals: 15 },
      { stage: 'ROI Analysis/Pricing', winRate: 0.65, totalDeals: 8 },
      { stage: 'Negotiation/Review', winRate: 0.85, totalDeals: 5 }
    ];
  }

  async getSalesStageFunnel(filters: any): Promise<Array<any>> {
    // Return sample stage funnel data filtered by sales rep
    return [
      { stage: 'Discover', count: 20, value: 5000000 },
      { stage: 'Developing Champions', count: 15, value: 4000000 },
      { stage: 'ROI Analysis/Pricing', count: 8, value: 2500000 },
      { stage: 'Negotiation/Review', count: 5, value: 1500000 }
    ];
  }

  async getSalesWinRateAnalysis(filters: any): Promise<any> {
    // Get the most recent snapshot date
    const latestDateResult = await db
      .select({ maxDate: sql<string>`MAX(${snapshots.snapshotDate})::date::text` })
      .from(snapshots);
    
    const latestDateStr = latestDateResult[0]?.maxDate;
    console.log('📊 Using latest snapshot date for sales win rate:', latestDateStr);
    
    if (!latestDateStr) {
      console.log('❌ No snapshots found for win rate calculation');
      return { winRate: 0 };
    }
    
    // Build where conditions for filtering (only closed deals in latest snapshot)
    let whereConditions = [
      sql`${snapshots.snapshotDate}::date = ${latestDateStr}::date`,
      sql`${snapshots.stage} IN ('Closed Won', 'Closed Lost')`,
      sql`${snapshots.enteredPipeline} IS NOT NULL` // Only count deals that entered pipeline
    ];
    
    // Add sales rep filter if specified
    if (filters.salesRep && filters.salesRep !== 'all') {
      whereConditions.push(eq(opportunities.owner, filters.salesRep));
    }
    
    // Get closed deals for this sales rep
    const closedDeals = await db
      .select({
        stage: snapshots.stage,
        opportunityId: snapshots.opportunityId
      })
      .from(snapshots)
      .innerJoin(opportunities, eq(snapshots.opportunityId, opportunities.id))
      .where(and(...whereConditions));
    
    // Count won vs lost
    const wonDeals = closedDeals.filter(deal => deal.stage === 'Closed Won').length;
    const lostDeals = closedDeals.filter(deal => deal.stage === 'Closed Lost').length;
    const totalClosed = wonDeals + lostDeals;
    
    const winRate = totalClosed > 0 ? wonDeals / totalClosed : 0;
    
    console.log(`📊 Sales win rate for ${filters.salesRep || 'all'}: ${wonDeals} won, ${lostDeals} lost, ${(winRate * 100).toFixed(1)}% win rate`);
    
    return { winRate };
  }

  async getSalesCloseRateAnalysis(filters: any): Promise<any> {
    // Return sample close rate analysis filtered by sales rep
    return { closeRate: 0.075 };
  }

  async getSalesLossReasons(filters: any): Promise<Array<any>> {
    // Get loss reasons filtered by sales rep
    let whereConditions = [
      sql`${snapshots.stage} = 'Closed Lost'`,
      sql`${snapshots.lossReason} IS NOT NULL`
    ];

    if (filters.salesRep && filters.salesRep !== 'all') {
      whereConditions.push(eq(opportunities.owner, filters.salesRep));
    }

    try {
      const result = await db
        .select({
          lossReason: snapshots.lossReason,
          year1Value: snapshots.year1Value
        })
        .from(snapshots)
        .leftJoin(opportunities, eq(snapshots.opportunityId, opportunities.id))
        .where(and(...whereConditions));

      // Group by loss reason
      const lossReasonData: { [key: string]: { count: number; totalValue: number } } = {};
      
      result.forEach(row => {
        if (row.lossReason) {
          const reason = row.lossReason;
          lossReasonData[reason] = lossReasonData[reason] || { count: 0, totalValue: 0 };
          lossReasonData[reason].count += 1;
          lossReasonData[reason].totalValue += Number(row.year1Value || 0);
        }
      });

      return Object.entries(lossReasonData).map(([reason, data]) => ({
        reason,
        count: data.count,
        totalValue: data.totalValue,
        percentage: 0 // Calculate if needed
      }));
    } catch (error) {
      console.error('Error in getSalesLossReasons:', error);
      return [];
    }
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

  async getSalesTotalYear1ARR(filters: any): Promise<number> {
    // Get the most recent snapshot date
    const latestDateResult = await db
      .select({ maxDate: sql<string>`MAX(${snapshots.snapshotDate})::date::text` })
      .from(snapshots);
    
    const latestDateStr = latestDateResult[0]?.maxDate;
    console.log('🗓️ Using latest snapshot date for sales Year1 ARR:', latestDateStr);
    
    if (!latestDateStr) {
      console.log('❌ No snapshots found for Year1 ARR calculation');
      return 0;
    }
    
    // Build where conditions for filtering
    let whereConditions = [
      sql`${snapshots.snapshotDate}::date = ${latestDateStr}::date`,
      sql`${snapshots.stage} NOT IN ('Validation/Introduction', 'Closed Won', 'Closed Lost')`
    ];
    
    // Add sales rep filter if specified
    if (filters.salesRep && filters.salesRep !== 'all') {
      whereConditions.push(eq(opportunities.owner, filters.salesRep));
    }
    
    // Calculate total Year1 ARR
    const result = await db
      .select({
        totalYear1ARR: sql<number>`SUM(COALESCE(${snapshots.year1Value}, 0))`
      })
      .from(snapshots)
      .innerJoin(opportunities, eq(snapshots.opportunityId, opportunities.id))
      .where(and(...whereConditions));
    
    const totalYear1ARR = Number(result[0]?.totalYear1ARR || 0);
    console.log('💰 Total Year1 ARR calculation:', totalYear1ARR);
    
    return totalYear1ARR;
  }
}

// Export the singleton instance
export const salesStorage = new PostgreSQLSalesStorage();