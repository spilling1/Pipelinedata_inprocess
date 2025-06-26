import { db } from './db';
import { opportunities, snapshots } from '../shared/schema';
import { sql, and, eq, gte, lte, like, inArray, or, desc, asc } from 'drizzle-orm';

export class SalesStorage {
  /**
   * Get list of sales representatives with opportunity counts
   */
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

  /**
   * Get list of clients with opportunity counts
   */
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

  /**
   * Get pipeline value by date with sales rep filtering
   */
  async getSalesPipelineValueByDate(filters: any): Promise<Array<{ date: Date; value: number }>> {
    let whereConditions = [
      sql`${snapshots.stage} NOT LIKE '%Closed%'`,
      sql`${snapshots.stage} NOT LIKE '%Validation%'`,
      sql`${snapshots.year1Value} > 0`
    ];

    // Add sales rep filter
    if (filters.salesRep && filters.salesRep !== 'all') {
      whereConditions.push(eq(opportunities.owner, filters.salesRep));
    }

    // Add date range filters
    if (filters.startDate) {
      whereConditions.push(gte(snapshots.snapshotDate, filters.startDate));
    }
    if (filters.endDate) {
      whereConditions.push(lte(snapshots.snapshotDate, filters.endDate));
    }

    // Add other filters
    if (filters.stages?.length > 0) {
      whereConditions.push(inArray(snapshots.stage, filters.stages));
    }
    if (filters.minValue) {
      whereConditions.push(gte(snapshots.year1Value, Number(filters.minValue)));
    }
    if (filters.maxValue) {
      whereConditions.push(lte(snapshots.year1Value, Number(filters.maxValue)));
    }
    if (filters.search) {
      whereConditions.push(like(opportunities.name, `%${filters.search}%`));
    }
    if (filters.clientName && filters.clientName !== 'all') {
      whereConditions.push(eq(opportunities.clientName, filters.clientName));
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

  /**
   * Get stage distribution with sales rep filtering
   */
  async getSalesStageDistribution(filters: any): Promise<Array<{ stage: string; count: number; value: number }>> {
    let whereConditions = [
      sql`${snapshots.stage} NOT LIKE '%Closed%'`
    ];

    if (filters.salesRep && filters.salesRep !== 'all') {
      whereConditions.push(eq(opportunities.owner, filters.salesRep));
    }

    // Add other filters similar to pipeline value
    if (filters.startDate) {
      whereConditions.push(gte(snapshots.snapshotDate, filters.startDate));
    }
    if (filters.endDate) {
      whereConditions.push(lte(snapshots.snapshotDate, filters.endDate));
    }

    const result = await db
      .select({
        stage: snapshots.stage,
        count: sql<number>`COUNT(DISTINCT ${snapshots.opportunityId})`,
        value: sql<number>`SUM(COALESCE(${snapshots.year1Value}, 0))`
      })
      .from(snapshots)
      .innerJoin(opportunities, eq(snapshots.opportunityId, opportunities.id))
      .where(and(...whereConditions))
      .groupBy(snapshots.stage)
      .orderBy(sql`COUNT(*) DESC`);
    
    return result.map(r => ({ 
      stage: r.stage, 
      count: Number(r.count) || 0, 
      value: Number(r.value) || 0 
    }));
  }

  /**
   * Get fiscal year pipeline with sales rep filtering
   */
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

  /**
   * Get fiscal quarter pipeline with sales rep filtering
   */
  async getSalesFiscalQuarterPipeline(filters: any): Promise<Array<{ fiscalQuarter: string; value: number }>> {
    let whereConditions = [
      sql`${snapshots.stage} NOT LIKE '%Closed%'`,
      sql`${snapshots.year1Value} > 0`
    ];

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

  /**
   * Get monthly pipeline with sales rep filtering
   */
  async getSalesMonthlyPipeline(filters: any): Promise<Array<{ month: string; value: number }>> {
    let whereConditions = [
      sql`${snapshots.stage} NOT LIKE '%Closed%'`,
      sql`${snapshots.year1Value} > 0`
    ];

    if (filters.salesRep && filters.salesRep !== 'all') {
      whereConditions.push(eq(opportunities.owner, filters.salesRep));
    }

    const result = await db
      .select({
        month: sql<string>`TO_CHAR(${snapshots.snapshotDate}, 'Mon YYYY')`,
        value: sql<number>`SUM(COALESCE(${snapshots.year1Value}, 0))`
      })
      .from(snapshots)
      .innerJoin(opportunities, eq(snapshots.opportunityId, opportunities.id))
      .where(and(...whereConditions))
      .groupBy(sql`TO_CHAR(${snapshots.snapshotDate}, 'Mon YYYY')`)
      .orderBy(sql`TO_CHAR(${snapshots.snapshotDate}, 'Mon YYYY')`);
    
    return result.map(r => ({ 
      month: r.month, 
      value: Number(r.value) || 0 
    }));
  }

  // Placeholder methods for other analytics - implement based on existing storage patterns
  async getSalesStageTimingData(filters: any): Promise<Array<{ stage: string; avgDays: number; dealCount: number }>> {
    // Implementation would go here - similar to existing getStageTimingData but with sales rep filtering
    return [];
  }

  async getSalesDateSlippageData(filters: any): Promise<Array<any>> {
    // Implementation would go here
    return [];
  }

  async getSalesDuplicateOpportunities(filters: any): Promise<Array<any>> {
    // Implementation would go here
    return [];
  }

  async getSalesValueChanges(filters: any): Promise<Array<any>> {
    // Implementation would go here
    return [];
  }

  async getSalesClosingProbabilityData(filters: any): Promise<Array<any>> {
    // Implementation would go here
    return [];
  }

  async getSalesStageFunnel(filters: any): Promise<Array<any>> {
    // Implementation would go here
    return [];
  }

  async getSalesWinRateAnalysis(filters: any): Promise<any> {
    // Implementation would go here
    return {};
  }

  async getSalesCloseRateAnalysis(filters: any): Promise<any> {
    // Implementation would go here
    return {};
  }

  async getSalesLossReasons(filters: any): Promise<Array<any>> {
    // Implementation would go here
    return [];
  }

  async getSalesOpportunities(filters: any): Promise<Array<any>> {
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

    const result = await db
      .select({
        id: opportunities.id,
        name: opportunities.name,
        clientName: opportunities.clientName,
        owner: opportunities.owner,
        createdDate: opportunities.createdDate,
      })
      .from(opportunities)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(opportunities.name);

    return result;
  }

  async getSalesStageFlow(filters: any): Promise<any> {
    // Implementation would go here
    return { stageFlow: [], flowSummary: null };
  }

  async getSalesLossAnalysis(filters: any): Promise<any> {
    // Implementation would go here
    return { lossByStage: [], lossInsights: [] };
  }

  async getSalesRecentLosses(filters: any): Promise<Array<any>> {
    // Implementation would go here
    return [];
  }
}

export const salesStorage = new SalesStorage();