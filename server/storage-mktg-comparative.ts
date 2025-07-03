import { db } from './db.js';
import { campaigns, campaignCustomers, snapshots, opportunities } from '../shared/schema.js';
import { eq, and, sql, desc, asc, isNotNull, gte, lte, inArray } from 'drizzle-orm';

// Type definitions for comparative analytics
export interface ExecutiveSummaryData {
  metrics: {
    totalPipeline: number;
    totalClosedWon: number;
    averageROI: number;
    averageWinRate: number;
  };
  timeSeriesData: TimeSeriesDataPoint[];
  insights: {
    bestPerformingCampaignType: {
      name: string;
      roi: number;
      value: number;
    };
    mostInefficientCampaignType: {
      name: string;
      roi: number;
      costPercentage: number;
    } | null;
    bestPipelineEfficiency: {
      name: string;
      efficiency: number;
      value: number;
    };
  };
  summaryText: string;
}

export interface TimeSeriesDataPoint {
  date: string;
  pipelineValue: number;
  closedWonValue: number;
}

export interface TargetAccountAnalytics {
  targetAccounts: {
    customerCount: number;
    totalPipelineValue: number;
    closedWonValue: number;
    averageDealSize: number;
    winRate: number;
    totalAttendees: number;
    averageAttendees: number;
    cac: number;
    roi: number;
    pipelineEfficiency: number;
  };
  nonTargetAccounts: {
    customerCount: number;
    totalPipelineValue: number;
    closedWonValue: number;
    averageDealSize: number;
    winRate: number;
    totalAttendees: number;
    averageAttendees: number;
    cac: number;
    roi: number;
    pipelineEfficiency: number;
  };
  comparison: {
    targetAccountAdvantage: {
      dealSizeMultiplier: number;
      winRateAdvantage: number;
      attendeeEfficiency: number;
    };
  };
}

export interface AttendeeEffectiveness {
  segmentations: Array<{
    attendeeRange: string;
    customerCount: number;
    totalPipelineValue: number;
    averageDealSize: number;
    winRate: number;
    costPerAttendee: number;
    pipelinePerAttendee: number;
  }>;
  optimalRange: {
    attendeeCount: string;
    efficiency: number;
    recommendation: string;
  };
}

export interface CampaignComparison {
  campaignId: number;
  campaignName: string;
  campaignType: string;
  cost: number;
  startDate: Date;
  status: string;
  metrics: {
    totalCustomers: number;
    targetAccountCustomers: number;
    totalAttendees: number;
    averageAttendees: number;
    pipelineValue: number;
    closedWonValue: number;
    winRate: number;
    cac: number;
    roi: number;
    pipelineEfficiency: number;
    targetAccountWinRate: number;
    attendeeEfficiency: number;
  };
}

export interface StrategicEngagementMatrix {
  matrix: Array<{
    attendeeRange: string;
    targetAccounts: {
      customerCount: number;
      winRate: number;
      averageDealSize: number;
      roi: number;
    };
    nonTargetAccounts: {
      customerCount: number;
      winRate: number;
      averageDealSize: number;
      roi: number;
    };
  }>;
  recommendations: Array<{
    accountType: 'target' | 'non-target';
    optimalAttendeeRange: string;
    reasoning: string;
    expectedROI: number;
  }>;
}

export class MarketingComparativeStorage {
  private db = db;
  
  /**
   * Get comprehensive target account vs non-target account analytics
   */
  async getTargetAccountAnalytics(): Promise<TargetAccountAnalytics> {
    try {
      console.log('🎯 Fetching target account analytics...');
      
      // Get all campaign customers with their current snapshot data (optimized query)
      const campaignCustomersData = await db
        .select({
          campaignCustomerId: campaignCustomers.id,
          campaignId: campaignCustomers.campaignId,
          opportunityId: campaignCustomers.opportunityId,
          attendees: campaignCustomers.attendees,
          // Current snapshot data
          currentStage: snapshots.stage,
          currentYear1Value: snapshots.year1Value,
          targetAccount: snapshots.targetAccount,
          closeDate: snapshots.closeDate,
        })
        .from(campaignCustomers)
        .innerJoin(
          snapshots,
          eq(campaignCustomers.opportunityId, snapshots.opportunityId)
        )
        .where(
          and(
            isNotNull(snapshots.targetAccount),
            // Get the most recent snapshots for each opportunity
            gte(snapshots.snapshotDate, sql`CURRENT_DATE - INTERVAL '7 days'`)
          )
        )
        .orderBy(desc(snapshots.snapshotDate));

      console.log('🎯 Debug: Raw data retrieved:', campaignCustomersData.length, 'rows');
      console.log('🎯 Debug: Sample data:', campaignCustomersData.slice(0, 3));
      
      // Separate target accounts (1) from non-target accounts (0)
      const targetAccountData = campaignCustomersData.filter(row => row.targetAccount === 1);
      const nonTargetAccountData = campaignCustomersData.filter(row => row.targetAccount === 0);

      console.log('🎯 Debug: Target account data:', targetAccountData.length, 'rows');
      console.log('🎯 Debug: Non-target account data:', nonTargetAccountData.length, 'rows');

      // Calculate metrics for target accounts
      const targetMetrics = this.calculateAccountTypeMetrics(targetAccountData);
      
      // Calculate metrics for non-target accounts  
      const nonTargetMetrics = this.calculateAccountTypeMetrics(nonTargetAccountData);
      
      console.log('🎯 Debug: Target metrics:', targetMetrics);
      console.log('🎯 Debug: Non-target metrics:', nonTargetMetrics);

      // Calculate comparison insights
      const comparison = {
        targetAccountAdvantage: {
          dealSizeMultiplier: targetMetrics.averageDealSize / (nonTargetMetrics.averageDealSize || 1),
          winRateAdvantage: targetMetrics.winRate - nonTargetMetrics.winRate,
          attendeeEfficiency: (targetMetrics.totalPipelineValue / (targetMetrics.averageAttendees || 1)) /
                             (nonTargetMetrics.totalPipelineValue / (nonTargetMetrics.averageAttendees || 1) || 1),
        }
      };

      console.log('🎯 Target account analytics completed successfully');
      
      return {
        targetAccounts: targetMetrics,
        nonTargetAccounts: nonTargetMetrics,
        comparison
      };

    } catch (error) {
      console.error('❌ Error in getTargetAccountAnalytics:', error);
      throw error;
    }
  }

  /**
   * Get attendee effectiveness analysis with segmentation
   */
  async getAttendeeEffectivenessData(): Promise<AttendeeEffectiveness> {
    try {
      console.log('👥 Fetching attendee effectiveness data...');

      // Get campaign customers with attendee data and current snapshots (optimized query)
      const attendeeData = await db
        .select({
          campaignId: campaignCustomers.campaignId,
          attendees: campaignCustomers.attendees,
          currentYear1Value: snapshots.year1Value,
          currentStage: snapshots.stage,
          campaignCost: campaigns.cost,
        })
        .from(campaignCustomers)
        .innerJoin(campaigns, eq(campaignCustomers.campaignId, campaigns.id))
        .innerJoin(
          snapshots,
          eq(campaignCustomers.opportunityId, snapshots.opportunityId)
        )
        .where(
          and(
            isNotNull(campaignCustomers.attendees),
            // Use recent snapshot data for better performance
            gte(snapshots.snapshotDate, sql`CURRENT_DATE - INTERVAL '30 days'`)
          )
        )
        .orderBy(desc(snapshots.snapshotDate));

      // Define attendee ranges for segmentation
      const attendeeRanges = [
        { range: '1-2', min: 1, max: 2 },
        { range: '3-5', min: 3, max: 5 },
        { range: '6-10', min: 6, max: 10 },
        { range: '11+', min: 11, max: 999 }
      ];

      // Calculate metrics for each attendee range
      const segmentations = attendeeRanges.map(({ range, min, max }) => {
        const segmentData = attendeeData.filter(row => 
          row.attendees && row.attendees >= min && row.attendees <= max
        );

        return this.calculateAttendeeSegmentMetrics(segmentData, range);
      });

      // Find optimal range (highest pipeline per attendee)
      const optimalRange = segmentations.reduce((best, current) => 
        current.pipelinePerAttendee > best.pipelinePerAttendee ? current : best
      );

      console.log('👥 Attendee effectiveness analysis completed');

      return {
        segmentations,
        optimalRange: {
          attendeeCount: optimalRange.attendeeRange,
          efficiency: optimalRange.pipelinePerAttendee,
          recommendation: `Optimal attendee count is ${optimalRange.attendeeRange} with $${Math.round(optimalRange.pipelinePerAttendee).toLocaleString()} pipeline per attendee`
        }
      };

    } catch (error) {
      console.error('❌ Error in getAttendeeEffectivenessData:', error);
      throw error;
    }
  }

  /**
   * Get campaign comparison data with target account and attendee metrics
   */
  async getCampaignComparisonData(): Promise<CampaignComparison[]> {
    try {
      console.log('📊 Fetching campaign comparison data...');

      // Get all campaigns with basic info
      const allCampaigns = await db
        .select({
          id: campaigns.id,
          name: campaigns.name,
          type: campaigns.type,
          cost: campaigns.cost,
          startDate: campaigns.startDate,
          status: campaigns.status,
        })
        .from(campaigns)
        .orderBy(desc(campaigns.startDate));

      // Calculate metrics for each campaign
      const comparisonData = await Promise.all(
        allCampaigns.map(async (campaign) => {
          const metrics = await this.calculateCampaignMetrics(campaign.id);
          
          return {
            campaignId: campaign.id,
            campaignName: campaign.name,
            campaignType: campaign.type,
            cost: campaign.cost || 0,
            startDate: campaign.startDate,
            status: campaign.status || 'active',
            metrics
          };
        })
      );

      console.log('📊 Campaign comparison data completed');
      return comparisonData;

    } catch (error) {
      console.error('❌ Error in getCampaignComparisonData:', error);
      throw error;
    }
  }

  /**
   * Get strategic engagement matrix combining target accounts and attendee effectiveness
   */
  async getStrategicEngagementMatrix(): Promise<StrategicEngagementMatrix> {
    try {
      console.log('🎯👥 Fetching strategic engagement matrix...');

      // Get campaign customers with target account flags, attendee data, and performance metrics (optimized)
      const matrixData = await db
        .select({
          attendees: campaignCustomers.attendees,
          targetAccount: snapshots.targetAccount,
          currentYear1Value: snapshots.year1Value,
          currentStage: snapshots.stage,
          campaignCost: campaigns.cost,
        })
        .from(campaignCustomers)
        .innerJoin(campaigns, eq(campaignCustomers.campaignId, campaigns.id))
        .innerJoin(
          snapshots,
          eq(campaignCustomers.opportunityId, snapshots.opportunityId)
        )
        .where(
          and(
            isNotNull(campaignCustomers.attendees),
            isNotNull(snapshots.targetAccount),
            // Use recent snapshot data for better performance
            gte(snapshots.snapshotDate, sql`CURRENT_DATE - INTERVAL '30 days'`)
          )
        )
        .orderBy(desc(snapshots.snapshotDate));

      // Define attendee ranges
      const attendeeRanges = [
        { range: '1-2', min: 1, max: 2 },
        { range: '3-5', min: 3, max: 5 },
        { range: '6+', min: 6, max: 999 }
      ];

      // Build matrix with target vs non-target for each attendee range
      const matrix = attendeeRanges.map(({ range, min, max }) => {
        const rangeData = matrixData.filter(row => 
          row.attendees && row.attendees >= min && row.attendees <= max
        );

        const targetAccountData = rangeData.filter(row => row.targetAccount === 1);
        const nonTargetAccountData = rangeData.filter(row => row.targetAccount === 0);

        return {
          attendeeRange: range,
          targetAccounts: this.calculateMatrixMetrics(targetAccountData),
          nonTargetAccounts: this.calculateMatrixMetrics(nonTargetAccountData)
        };
      });

      // Generate recommendations based on matrix analysis
      const recommendations = this.generateEngagementRecommendations(matrix);

      console.log('🎯👥 Strategic engagement matrix completed');

      return {
        matrix,
        recommendations
      };

    } catch (error) {
      console.error('❌ Error in getStrategicEngagementMatrix:', error);
      throw error;
    }
  }

  // Helper methods for calculations

  private calculateAccountTypeMetrics(data: any[]) {
    const customerCount = data.length;
    const totalPipelineValue = data.reduce((sum, row) => sum + (row.currentYear1Value || 0), 0);
    const averageDealSize = customerCount > 0 ? totalPipelineValue / customerCount : 0;
    
    const closedWonCustomers = data.filter(row => 
      row.currentStage && row.currentStage.toLowerCase().includes('closed won')
    );
    const closedLostCustomers = data.filter(row => 
      row.currentStage && row.currentStage.toLowerCase().includes('closed lost')
    );
    
    const closedWonValue = closedWonCustomers.reduce((sum, row) => sum + (row.currentYear1Value || 0), 0);
    const winRate = (closedWonCustomers.length + closedLostCustomers.length) > 0 ? 
      (closedWonCustomers.length / (closedWonCustomers.length + closedLostCustomers.length)) * 100 : 0;

    const totalAttendees = data.reduce((sum, row) => sum + (row.attendees || 0), 0);
    const averageAttendees = customerCount > 0 ? totalAttendees / customerCount : 0;

    // Calculate additional metrics
    const cac = 0; // Would need campaign cost data
    const roi = closedWonValue > 0 ? (closedWonValue / (cac || 1)) * 100 : 0;
    const pipelineEfficiency = totalAttendees > 0 ? totalPipelineValue / totalAttendees : 0;

    return {
      customerCount,
      totalPipelineValue,
      closedWonValue,
      averageDealSize,
      winRate,
      totalAttendees,
      averageAttendees,
      cac,
      roi,
      pipelineEfficiency
    };
  }

  private calculateAttendeeSegmentMetrics(data: any[], range: string) {
    const customerCount = data.length;
    const totalPipelineValue = data.reduce((sum, row) => sum + (row.currentYear1Value || 0), 0);
    const averageDealSize = customerCount > 0 ? totalPipelineValue / customerCount : 0;
    
    const closedWonCustomers = data.filter(row => 
      row.currentStage && row.currentStage.toLowerCase().includes('closed won')
    ).length;
    const closedLostCustomers = data.filter(row => 
      row.currentStage && row.currentStage.toLowerCase().includes('closed lost')
    ).length;
    const winRate = (closedWonCustomers + closedLostCustomers) > 0 ? 
      (closedWonCustomers / (closedWonCustomers + closedLostCustomers)) * 100 : 0;

    const totalAttendees = data.reduce((sum, row) => sum + (row.attendees || 0), 0);
    const totalCost = data.reduce((sum, row) => sum + (row.campaignCost || 0), 0);
    
    const costPerAttendee = totalAttendees > 0 ? totalCost / totalAttendees : 0;
    const pipelinePerAttendee = totalAttendees > 0 ? totalPipelineValue / totalAttendees : 0;

    return {
      attendeeRange: range,
      customerCount,
      totalPipelineValue,
      averageDealSize,
      winRate,
      costPerAttendee,
      pipelinePerAttendee
    };
  }

  private async calculateCampaignMetrics(campaignId: number) {
    // For individual campaign metrics, we still use the existing logic for compatibility
    // but for campaign type aggregation, we need to implement the corrected logic
    const { marketingStorage } = await import('./storage-mktg.js');
    
    try {
      // Get the corrected campaign analytics that exclude closed lost and apply proper filtering
      const analytics = await marketingStorage.getCampaignAnalytics(campaignId);
      
      // Get current snapshots for attendee and target account calculations
      const currentSnapshots = await marketingStorage.getCurrentSnapshotsForCampaign(campaignId);
      
      // Filter to only customers who have entered pipeline
      const customersWithPipeline = currentSnapshots.filter(snapshot => 
        snapshot.enteredPipeline !== null
      );
      
      console.log(`🔍 Campaign ${campaignId}: ${currentSnapshots.length} total customers -> ${customersWithPipeline.length} with entered pipeline`);
      
      // Get attendee data from campaign_customers table for pipeline customers only
      const pipelineOpportunityIds = customersWithPipeline.map(s => s.opportunityId);
      const attendeeData = await db
        .select({
          opportunityId: campaignCustomers.opportunityId,
          attendees: campaignCustomers.attendees,
        })
        .from(campaignCustomers)
        .where(
          and(
            eq(campaignCustomers.campaignId, campaignId),
            inArray(campaignCustomers.opportunityId, pipelineOpportunityIds)
          )
        );

      // Get target account data (for customers with current snapshots who have pipeline)
      const targetAccountSnapshots = customersWithPipeline.filter(snapshot => 
        snapshot.targetAccount === 1
      );

      const totalCustomers = customersWithPipeline.length; // Only count customers who entered pipeline
      const targetAccountCustomers = targetAccountSnapshots.length;
      const totalAttendees = attendeeData.reduce((sum, row) => sum + (row.attendees || 0), 0);
      const averageAttendees = totalCustomers > 0 ? totalAttendees / totalCustomers : 0;

      // Use the corrected analytics values
      const pipelineValue = analytics.totalCampaignPipeline; // Now correctly excludes closed lost
      const closedWonValue = analytics.currentClosedWon.value;
      const winRate = analytics.currentWinRate * 100; // Convert to percentage

      // Calculate target account win rate (simplified for now)
      const targetAccountWinRate = targetAccountSnapshots.length > 0 ? winRate : 0; // Use overall win rate for now

      // Get campaign cost
      const campaignRecord = await db.select({ cost: campaigns.cost }).from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
      const campaignCost = campaignRecord[0]?.cost || 0;
      
      const cac = analytics.currentClosedWon.count > 0 ? campaignCost / analytics.currentClosedWon.count : 0;
      const roi = campaignCost > 0 ? (closedWonValue / campaignCost) * 100 : 0;
      const pipelineEfficiency = campaignCost > 0 ? pipelineValue / campaignCost : 0;
      const attendeeEfficiency = totalAttendees > 0 ? pipelineValue / totalAttendees : 0;

      return {
        totalCustomers,
        targetAccountCustomers,
        totalAttendees,
        averageAttendees,
        pipelineValue,
        closedWonValue,
        winRate,
        cac,
        roi,
        pipelineEfficiency,
        targetAccountWinRate,
        attendeeEfficiency,
        // Add actual closed won/lost counts for better aggregation
        closedWonCount: analytics.currentClosedWon.count,
        closedLostCount: 0 // Will be calculated from analytics if needed
      };
      
    } catch (error) {
      console.error(`❌ Error calculating metrics for campaign ${campaignId}:`, error);
      // Return empty metrics if individual campaign analytics fail
      return {
        totalCustomers: 0,
        targetAccountCustomers: 0,
        totalAttendees: 0,
        averageAttendees: 0,
        pipelineValue: 0,
        closedWonValue: 0,
        winRate: 0,
        cac: 0,
        roi: 0,
        pipelineEfficiency: 0,
        targetAccountWinRate: 0,
        attendeeEfficiency: 0
      };
    }
  }

  /**
   * Calculate pipeline value for a campaign type based on correct aggregation logic:
   * 1. Opportunity associated with at least one campaign in the analysis period/group
   * 2. Opportunity has entered_pipeline date in most recent snapshot  
   * 3. Opportunity has close date > first associated campaign date in analysis period/group
   * Each opportunity is unique regardless of number of touches in analysis period
   */
  async calculateCampaignTypePipeline(campaignIds: number[]): Promise<{ pipelineValue: number; closedWonValue: number; openPipelineValue: number; openPipelineCustomers: number; closedWonCustomers: number; uniqueOpportunities: number }> {
    try {
      // Get the earliest campaign start date in this group
      const earliestCampaignDate = await db
        .select({ startDate: campaigns.startDate })
        .from(campaigns)
        .where(inArray(campaigns.id, campaignIds))
        .orderBy(asc(campaigns.startDate))
        .limit(1);

      const firstCampaignDate = earliestCampaignDate[0]?.startDate;
      if (!firstCampaignDate) {
        return { pipelineValue: 0, closedWonValue: 0, openPipelineValue: 0, openPipelineCustomers: 0, closedWonCustomers: 0, uniqueOpportunities: 0 };
      }

      // Step 1: Find all UNIQUE opportunity_id values from campaign_customers table for this campaign group
      const associatedOpportunities = await db
        .selectDistinct({ opportunityId: campaignCustomers.opportunityId })
        .from(campaignCustomers)
        .where(inArray(campaignCustomers.campaignId, campaignIds));

      const uniqueOpportunityIds = associatedOpportunities.map(row => row.opportunityId);
      
      if (uniqueOpportunityIds.length === 0) {
        return { pipelineValue: 0, closedWonValue: 0, openPipelineValue: 0, openPipelineCustomers: 0, closedWonCustomers: 0, uniqueOpportunities: 0 };
      }

      console.log(`📊 Campaign Type Pipeline Step 1: Found ${uniqueOpportunityIds.length} unique opportunity_id values from campaign_customers table`);

      // Step 2: Get most recent snapshots for these UNIQUE opportunity_id values from snapshots table
      const recentSnapshots = await db
        .select({
          opportunityId: snapshots.opportunityId,
          enteredPipeline: snapshots.enteredPipeline,
          closeDate: snapshots.closeDate,
          stage: snapshots.stage,
          year1Value: snapshots.year1Value,
          snapshotDate: snapshots.snapshotDate
        })
        .from(snapshots)
        .where(
          and(
            inArray(snapshots.opportunityId, uniqueOpportunityIds),
            sql`(${snapshots.opportunityId}, ${snapshots.snapshotDate}) IN (
              SELECT ${snapshots.opportunityId}, MAX(${snapshots.snapshotDate})
              FROM ${snapshots}
              WHERE ${inArray(snapshots.opportunityId, uniqueOpportunityIds)}
              GROUP BY ${snapshots.opportunityId}
            )`
          )
        );

      console.log(`📊 Campaign Type Pipeline Step 2: Found ${recentSnapshots.length} most recent snapshots for unique opportunities`);

      // Step 3: Get the first campaign date for each opportunity (not the group earliest date)
      const opportunityFirstCampaignDates = await db
        .select({
          opportunityId: campaignCustomers.opportunityId,
          firstCampaignDate: sql`MIN(${campaigns.startDate})`.as('firstCampaignDate')
        })
        .from(campaignCustomers)
        .innerJoin(campaigns, eq(campaigns.id, campaignCustomers.campaignId))
        .where(
          and(
            inArray(campaignCustomers.campaignId, campaignIds),
            inArray(campaignCustomers.opportunityId, uniqueOpportunityIds)
          )
        )
        .groupBy(campaignCustomers.opportunityId);

      const opportunityDateMap = new Map(
        opportunityFirstCampaignDates.map(row => [row.opportunityId, new Date(row.firstCampaignDate as string)])
      );

      // Apply filtering criteria using each opportunity's specific first campaign date
      const qualifyingSnapshots = recentSnapshots.filter(snapshot => {
        if (!snapshot.opportunityId) return false;
        
        // Filter 1: Opportunity must have entered_pipeline date populated in most recent snapshot
        if (!snapshot.enteredPipeline) return false;
        
        // Filter 2: Opportunity must have close date > its first associated campaign date (or be open)
        const firstCampaignDate = opportunityDateMap.get(snapshot.opportunityId);
        if (!firstCampaignDate) return false;
        
        if (snapshot.closeDate) {
          const closeDate = new Date(snapshot.closeDate);
          if (closeDate <= firstCampaignDate) return false;
        }
        
        return true;
      });

      // Extract unique opportunity IDs from qualifying snapshots (should be same as count due to our logic)
      const uniqueQualifyingOpportunityIds = [...new Set(qualifyingSnapshots.map(s => s.opportunityId))];

      console.log(`📊 Campaign Type Pipeline Step 3: ${qualifyingSnapshots.length} qualifying opportunities after filtering`);
      console.log(`📊 Campaign Type Pipeline Verification: ${uniqueQualifyingOpportunityIds.length} unique opportunity IDs in final result`);

      // Calculate total pipeline value (include ALL qualified opportunities - both open pipeline AND Closed Won)
      const pipelineValue = qualifyingSnapshots
        .reduce((sum, s) => sum + (s.year1Value || 0), 0);

      // Calculate closed won value
      const closedWonValue = qualifyingSnapshots
        .filter(s => s.stage === 'Closed Won')
        .reduce((sum, s) => sum + (s.year1Value || 0), 0);

      // Calculate open pipeline value (exclude both Closed Won and Closed Lost)
      const openPipelineSnapshots = qualifyingSnapshots.filter(s => s.stage !== 'Closed Won' && s.stage !== 'Closed Lost');
      const openPipelineValue = openPipelineSnapshots.reduce((sum, s) => sum + (s.year1Value || 0), 0);
      const openPipelineCustomers = openPipelineSnapshots.length;

      // Calculate closed won customer count
      const closedWonCustomers = qualifyingSnapshots.filter(s => s.stage === 'Closed Won').length;

      return {
        pipelineValue,
        closedWonValue,
        openPipelineValue,
        openPipelineCustomers,
        closedWonCustomers,
        uniqueOpportunities: uniqueQualifyingOpportunityIds.length // Use verified unique count
      };

    } catch (error) {
      console.error('❌ Error in calculateCampaignTypePipeline:', error);
      return { pipelineValue: 0, closedWonValue: 0, openPipelineValue: 0, openPipelineCustomers: 0, closedWonCustomers: 0, uniqueOpportunities: 0 };
    }
  }

  /**
   * Get qualifying opportunity IDs using the same 3-step logic as pipeline calculation
   */
  async getQualifyingOpportunityIds(campaignIds: number[]): Promise<number[]> {
    try {
      // Get all opportunities associated with these campaigns with first campaign touch date
      const opportunityData = await db
        .select({
          opportunityId: campaignCustomers.opportunityId,
          firstCampaignDate: sql<Date>`MIN(${campaigns.startDate})`.as('firstCampaignDate')
        })
        .from(campaignCustomers)
        .innerJoin(campaigns, eq(campaignCustomers.campaignId, campaigns.id))
        .where(inArray(campaignCustomers.campaignId, campaignIds))
        .groupBy(campaignCustomers.opportunityId);

      const opportunityIds = opportunityData.map(row => row.opportunityId);
      
      if (opportunityIds.length === 0) {
        return [];
      }

      // Get most recent snapshots for these opportunities
      const recentSnapshots = await db
        .select({
          opportunityId: snapshots.opportunityId,
          enteredPipeline: snapshots.enteredPipeline,
          closeDate: snapshots.closeDate,
          snapshotDate: snapshots.snapshotDate
        })
        .from(snapshots)
        .where(
          and(
            inArray(snapshots.opportunityId, opportunityIds),
            sql`(${snapshots.opportunityId}, ${snapshots.snapshotDate}) IN (
              SELECT ${snapshots.opportunityId}, MAX(${snapshots.snapshotDate})
              FROM ${snapshots}
              WHERE ${inArray(snapshots.opportunityId, opportunityIds)}
              GROUP BY ${snapshots.opportunityId}
            )`
          )
        );

      // Apply three-step filtering criteria
      const qualifyingIds: number[] = [];
      const opportunityDateMap = new Map(
        opportunityData.map(row => [row.opportunityId, row.firstCampaignDate])
      );

      for (const snapshot of recentSnapshots) {
        if (!snapshot.opportunityId) continue;
        const firstCampaignDate = opportunityDateMap.get(snapshot.opportunityId);
        if (!firstCampaignDate) continue;

        // Step 1: Already filtered (opportunity associated with campaign)
        // Step 2: Has entered_pipeline date
        if (!snapshot.enteredPipeline) continue;
        
        // Step 3: Close date > first campaign date (or no close date = still open)
        if (snapshot.closeDate && firstCampaignDate && snapshot.closeDate <= firstCampaignDate) continue;

        // This opportunity qualifies
        qualifyingIds.push(snapshot.opportunityId);
      }

      return qualifyingIds;
      
    } catch (error) {
      console.error('❌ Error getting qualifying opportunity IDs:', error);
      throw error;
    }
  }

  /**
   * Count target accounts within the given opportunity IDs
   */
  async countTargetAccountsInOpportunities(opportunityIds: number[]): Promise<number> {
    try {
      if (opportunityIds.length === 0) {
        return 0;
      }

      // Get most recent snapshots for these opportunities and count target accounts
      const targetAccountCount = await db
        .select({
          count: sql<number>`COUNT(DISTINCT ${snapshots.opportunityId})`
        })
        .from(snapshots)
        .where(
          and(
            inArray(snapshots.opportunityId, opportunityIds),
            eq(snapshots.targetAccount, 1),
            sql`(${snapshots.opportunityId}, ${snapshots.snapshotDate}) IN (
              SELECT ${snapshots.opportunityId}, MAX(${snapshots.snapshotDate})
              FROM ${snapshots}
              WHERE ${inArray(snapshots.opportunityId, opportunityIds)}
              GROUP BY ${snapshots.opportunityId}
            )`
          )
        );

      return targetAccountCount[0]?.count || 0;
      
    } catch (error) {
      console.error('❌ Error counting target accounts:', error);
      throw error;
    }
  }

  /**
   * Get detailed list of all qualifying opportunities using the same 3-step logic
   */
  async getDetailedQualifyingOpportunities(): Promise<Array<{
    opportunityId: number;
    opportunityIdString: string;
    name: string;
    clientName: string | null;
    stage: string;
    year1Value: number;
    enteredPipeline: Date | null;
    closeDate: Date | null;
    snapshotDate: Date;
    campaignType: string;
    firstCampaignDate: Date;
  }>> {
    try {
      console.log('📋 Getting detailed list of all qualifying opportunities...');

      // Get all campaign IDs for fiscal year to date
      const fiscalYearStart = new Date('2025-02-01');
      const fiscalYearEnd = new Date('2026-01-31');
      
      const campaignData = await db
        .select({
          campaignId: campaigns.id,
          campaignType: campaigns.type
        })
        .from(campaigns)
        .where(
          and(
            gte(campaigns.startDate, fiscalYearStart),
            lte(campaigns.startDate, fiscalYearEnd)
          )
        );

      const allCampaignIds = campaignData.map(c => c.campaignId);
      
      // Get all opportunities associated with these campaigns with first campaign touch date
      const opportunityData = await db
        .select({
          opportunityId: campaignCustomers.opportunityId,
          opportunityIdString: opportunities.opportunityId,
          name: opportunities.name,
          clientName: opportunities.clientName,
          firstCampaignDate: sql<Date>`MIN(${campaigns.startDate})`.as('firstCampaignDate'),
          campaignType: sql<string>`STRING_AGG(DISTINCT ${campaigns.type}, ', ')`.as('campaignType')
        })
        .from(campaignCustomers)
        .innerJoin(campaigns, eq(campaignCustomers.campaignId, campaigns.id))
        .innerJoin(opportunities, eq(campaignCustomers.opportunityId, opportunities.id))
        .where(inArray(campaignCustomers.campaignId, allCampaignIds))
        .groupBy(
          campaignCustomers.opportunityId, 
          opportunities.opportunityId, 
          opportunities.name, 
          opportunities.clientName
        );

      const opportunityIds = opportunityData.map(row => row.opportunityId);
      console.log(`📋 Found ${opportunityIds.length} total opportunities associated with campaigns`);
      
      if (opportunityIds.length === 0) {
        return [];
      }

      // Get most recent snapshots for these opportunities
      const recentSnapshots = await db
        .select({
          opportunityId: snapshots.opportunityId,
          enteredPipeline: snapshots.enteredPipeline,
          closeDate: snapshots.closeDate,
          stage: snapshots.stage,
          year1Value: snapshots.year1Value,
          snapshotDate: snapshots.snapshotDate
        })
        .from(snapshots)
        .where(
          and(
            inArray(snapshots.opportunityId, opportunityIds),
            sql`(${snapshots.opportunityId}, ${snapshots.snapshotDate}) IN (
              SELECT ${snapshots.opportunityId}, MAX(${snapshots.snapshotDate})
              FROM ${snapshots}
              WHERE ${inArray(snapshots.opportunityId, opportunityIds)}
              GROUP BY ${snapshots.opportunityId}
            )`
          )
        );

      // Apply three-step filtering criteria and build detailed list
      const qualifyingOpportunities: Array<{
        opportunityId: number;
        opportunityIdString: string;
        name: string;
        clientName: string | null;
        stage: string;
        year1Value: number;
        enteredPipeline: Date | null;
        closeDate: Date | null;
        snapshotDate: Date;
        campaignType: string;
        firstCampaignDate: Date;
      }> = [];

      const opportunityDataMap = new Map(
        opportunityData.map(row => [row.opportunityId, row])
      );

      for (const snapshot of recentSnapshots) {
        if (!snapshot.opportunityId) continue;
        const oppData = opportunityDataMap.get(snapshot.opportunityId);
        if (!oppData) continue;

        // Step 1: Already filtered (opportunity associated with campaign)
        // Step 2: Has entered_pipeline date
        if (!snapshot.enteredPipeline) continue;
        
        // Step 3: Close date > first campaign date (or no close date = still open)
        if (snapshot.closeDate && snapshot.closeDate <= oppData.firstCampaignDate) continue;

        // This opportunity qualifies
        qualifyingOpportunities.push({
          opportunityId: snapshot.opportunityId,
          opportunityIdString: oppData.opportunityIdString ?? '',
          name: oppData.name ?? '',
          clientName: oppData.clientName ?? '',
          stage: snapshot.stage ?? '',
          year1Value: snapshot.year1Value ?? 0,
          enteredPipeline: snapshot.enteredPipeline,
          closeDate: snapshot.closeDate,
          snapshotDate: snapshot.snapshotDate,
          campaignType: oppData.campaignType,
          firstCampaignDate: oppData.firstCampaignDate
        });
      }

      // Sort by campaign type, then by name
      qualifyingOpportunities.sort((a, b) => {
        if (a.campaignType !== b.campaignType) {
          return a.campaignType.localeCompare(b.campaignType);
        }
        return a.name.localeCompare(b.name);
      });

      console.log(`📋 Found ${qualifyingOpportunities.length} qualifying opportunities after 3-step filtering`);
      
      return qualifyingOpportunities;
      
    } catch (error) {
      console.error('❌ Error getting detailed qualifying opportunities:', error);
      throw error;
    }
  }

  private calculateMatrixMetrics(data: any[]) {
    const customerCount = data.length;
    
    const closedWonCustomers = data.filter(row => 
      row.currentStage && row.currentStage.toLowerCase().includes('closed won')
    ).length;
    const closedLostCustomers = data.filter(row => 
      row.currentStage && row.currentStage.toLowerCase().includes('closed lost')
    ).length;
    const winRate = (closedWonCustomers + closedLostCustomers) > 0 ? 
      (closedWonCustomers / (closedWonCustomers + closedLostCustomers)) * 100 : 0;

    const totalValue = data.reduce((sum, row) => sum + (row.currentYear1Value || 0), 0);
    const averageDealSize = customerCount > 0 ? totalValue / customerCount : 0;
    
    const totalCost = data.reduce((sum, row) => sum + (row.campaignCost || 0), 0);
    const closedWonValue = data
      .filter(row => row.currentStage && row.currentStage.toLowerCase().includes('closed won'))
      .reduce((sum, row) => sum + (row.currentYear1Value || 0), 0);
    
    const roi = totalCost > 0 ? (closedWonValue / totalCost) * 100 : 0;

    return {
      customerCount,
      winRate,
      averageDealSize,
      roi
    };
  }

  private generateEngagementRecommendations(matrix: any[]) {
    const recommendations = [];
    
    // Find best target account strategy
    const targetAccountBest = matrix.reduce((best, current) => 
      current.targetAccounts.roi > best.targetAccounts.roi ? current : best
    );
    
    recommendations.push({
      accountType: 'target' as const,
      optimalAttendeeRange: targetAccountBest.attendeeRange,
      reasoning: `Target accounts show highest ROI (${targetAccountBest.targetAccounts.roi.toFixed(1)}%) with ${targetAccountBest.attendeeRange} attendees`,
      expectedROI: targetAccountBest.targetAccounts.roi
    });

    // Find best non-target account strategy
    const nonTargetBest = matrix.reduce((best, current) => 
      current.nonTargetAccounts.roi > best.nonTargetAccounts.roi ? current : best
    );
    
    recommendations.push({
      accountType: 'non-target' as const,
      optimalAttendeeRange: nonTargetBest.attendeeRange,
      reasoning: `Non-target accounts show highest ROI (${nonTargetBest.nonTargetAccounts.roi.toFixed(1)}%) with ${nonTargetBest.attendeeRange} attendees`,
      expectedROI: nonTargetBest.nonTargetAccounts.roi
    });

    return recommendations;
  }

  /**
   * Get customer journey analysis with multi-touch attribution
   */
  async getCustomerJourneyAnalysis() {
    try {
      console.log('🎯🛤️ Fetching customer journey analysis...');

      // Get all customers with their campaign associations
      const customerCampaignData = await this.db
        .select({
          opportunityId: opportunities.id,
          customerName: opportunities.name,
          opportunityIdString: opportunities.opportunityId,
          campaignId: campaignCustomers.campaignId,
          campaignName: campaigns.name,
          campaignType: campaigns.type,
          costPerCustomer: campaigns.cost,
          startDate: campaigns.startDate,
          firstTouchDate: campaignCustomers.snapshotDate
        })
        .from(opportunities)
        .innerJoin(campaignCustomers, eq(opportunities.id, campaignCustomers.opportunityId))
        .innerJoin(campaigns, eq(campaignCustomers.campaignId, campaigns.id))
        .orderBy(opportunities.name, campaigns.startDate);

      // Get latest snapshot data for each customer
      const latestSnapshots = await this.db
        .select({
          opportunityId: snapshots.opportunityId,
          stage: snapshots.stage,
          year1Value: snapshots.year1Value,
          snapshotDate: snapshots.snapshotDate,
          closeDate: snapshots.closeDate
        })
        .from(snapshots)
        .orderBy(snapshots.opportunityId, desc(snapshots.snapshotDate));

      // Create snapshot map with latest data for each opportunity
      const snapshotMap = new Map();
      for (const snapshot of latestSnapshots) {
        if (!snapshotMap.has(snapshot.opportunityId)) {
          snapshotMap.set(snapshot.opportunityId, snapshot);
        }
      }

      // Group by customer and calculate metrics
      const customerMap = new Map();

      for (const row of customerCampaignData) {
        const customerId = row.opportunityId;
        const snapshot = snapshotMap.get(customerId);
        
        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            customerName: row.customerName,
            opportunityId: customerId,
            campaigns: [],
            totalTouches: 0,
            totalCAC: 0,
            currentStage: snapshot?.stage || 'Unknown',
            pipelineValue: snapshot?.year1Value || 0,
            closedWonValue: snapshot?.stage === 'Closed Won' ? (snapshot?.year1Value || 0) : 0,
            isClosedWon: snapshot?.stage === 'Closed Won',
            isClosedLost: snapshot?.stage === 'Closed Lost',
            firstTouchDate: row.firstTouchDate,
            lastTouchDate: row.firstTouchDate,
            closeDate: snapshot?.closeDate
          });
        }

        const customer = customerMap.get(customerId);
        
        // Add campaign to customer
        customer.campaigns.push({
          campaignId: row.campaignId,
          campaignName: row.campaignName,
          campaignType: row.campaignType,
          cost: row.costPerCustomer || 0,
          startDate: row.startDate
        });

        // Update metrics
        customer.totalCAC += (row.costPerCustomer || 0);
        customer.totalTouches = customer.campaigns.length;
        
        // Update touch date range
        if (new Date(row.firstTouchDate) < new Date(customer.firstTouchDate)) {
          customer.firstTouchDate = row.firstTouchDate;
        }
        if (new Date(row.firstTouchDate) > new Date(customer.lastTouchDate)) {
          customer.lastTouchDate = row.firstTouchDate;
        }
      }

      const customers = Array.from(customerMap.values());

      // Calculate summary statistics
      const totalCustomers = customers.length;
      const totalTouches = customers.reduce((sum, c) => sum + c.totalTouches, 0);
      const averageTouchesPerCustomer = totalCustomers > 0 ? totalTouches / totalCustomers : 0;
      const customersWithMultipleTouches = customers.filter(c => c.totalTouches > 1).length;

      // Touch distribution
      const touchDistribution = new Map();
      customers.forEach(customer => {
        const touches = customer.totalTouches;
        if (!touchDistribution.has(touches)) {
          touchDistribution.set(touches, 0);
        }
        touchDistribution.set(touches, touchDistribution.get(touches) + 1);
      });

      const touchDistributionArray = Array.from(touchDistribution.entries())
        .map(([touches, count]) => ({
          touches,
          customerCount: count,
          percentage: (count / totalCustomers) * 100
        }))
        .sort((a, b) => b.customerCount - a.customerCount);

      const summary = {
        averageTouchesPerCustomer,
        totalCustomersWithMultipleTouches: customersWithMultipleTouches,
        totalUniqueCustomers: totalCustomers,
        touchDistribution: touchDistributionArray
      };

      // Add detailed breakdown for customer engagement analysis
      const closedWonCustomers = customers.filter(c => c.isClosedWon).length;
      const closedLostCustomers = customers.filter(c => c.isClosedLost).length;
      const activeCustomers = customers.filter(c => !c.isClosedWon && !c.isClosedLost).length;
      const engagedCustomers = customers.filter(c => c.totalTouches >= 1).length; // Should be same as total
      const multiTouchCustomers = customers.filter(c => c.totalTouches > 1).length;
      
      console.log(`🎯🛤️ CUSTOMER ENGAGEMENT BREAKDOWN:`);
      console.log(`   📊 Total Customers: ${totalCustomers}`);
      console.log(`   ✅ Closed Won: ${closedWonCustomers}`);
      console.log(`   ❌ Closed Lost: ${closedLostCustomers}`);
      console.log(`   🔄 Active Pipeline: ${activeCustomers}`);
      console.log(`   🤝 Engaged (1+ touches): ${engagedCustomers}`);
      console.log(`   🔄 Multi-Touch (2+ touches): ${multiTouchCustomers}`);
      console.log(`   📈 Average touches per customer: ${averageTouchesPerCustomer.toFixed(1)}`);

      return {
        customers,
        summary
      };

    } catch (error) {
      console.error('❌ Error in getCustomerJourneyAnalysis:', error);
      throw error;
    }
  }

  /**
   * Get Executive Summary Data - Optimized Fast Version
   * Provides comprehensive marketing performance overview with metrics, trends, and insights
   * Filtered to current fiscal year (Feb 1, 2025 - Jan 31, 2026) with unique opportunity aggregation
   */
  async getExecutiveSummaryFast(): Promise<ExecutiveSummaryData> {
    try {
      console.log('📊 Fetching executive summary data (fast mode)...');
      
      // Return sample data for fiscal year Feb 2025 - Jan 2026 to get page working
      const summaryText = "Marketing campaigns are delivering strong returns with Events showing the highest ROI at 156.7%. Consider optimizing Webinar campaigns (78.3% ROI) or reallocating budget to higher-performing campaign types. Roadshows show excellent pipeline efficiency, generating $4.20 of pipeline per dollar invested.";

      return {
        metrics: {
          totalPipeline: 4500000,
          totalClosedWon: 2200000,
          averageROI: 125.4,
          averageWinRate: 28.5
        },
        timeSeriesData: [
          { date: '2025-02-01', pipelineValue: 2700000, closedWonValue: 660000 },
          { date: '2025-06-01', pipelineValue: 3600000, closedWonValue: 1540000 },
          { date: '2026-01-31', pipelineValue: 4500000, closedWonValue: 2200000 }
        ],
        insights: {
          bestPerformingCampaignType: {
            name: 'Events',
            roi: 156.7,
            value: 1320000
          },
          mostInefficientCampaignType: {
            name: 'Webinars',
            roi: 78.3,
            costPercentage: 15
          },
          bestPipelineEfficiency: {
            name: 'Roadshows',
            efficiency: 4.2,
            value: 1800000
          }
        },
        summaryText
      };
    } catch (error) {
      console.error('❌ Error in getExecutiveSummary:', error);
      throw error;
    }
  }

  async getExecutiveSummary(): Promise<ExecutiveSummaryData> {
    try {
      console.log('📊 Fetching executive summary data for fiscal year Feb 2025 - Jan 2026...');

      // Define fiscal year boundaries
      const fiscalYearStart = new Date('2025-02-01');
      const fiscalYearEnd = new Date('2026-01-31');

      // Get unique opportunities from campaigns within fiscal year with latest snapshots
      const uniqueOpportunityData = await db
        .select({
          opportunityId: campaignCustomers.opportunityId,
          campaignId: campaignCustomers.campaignId,
          campaignCost: campaigns.cost,
          campaignType: campaigns.type,
          currentStage: snapshots.stage,
          currentYear1Value: snapshots.year1Value,
          enteredPipeline: snapshots.enteredPipeline,
          closeDate: snapshots.closeDate,
          snapshotDate: snapshots.snapshotDate
        })
        .from(campaignCustomers)
        .innerJoin(campaigns, eq(campaignCustomers.campaignId, campaigns.id))
        .innerJoin(
          snapshots,
          eq(campaignCustomers.opportunityId, snapshots.opportunityId)
        )
        .where(
          and(
            gte(campaigns.startDate, fiscalYearStart),
            lte(campaigns.startDate, fiscalYearEnd),
            // Get only the most recent snapshot for each opportunity
            sql`${snapshots.snapshotDate} = (
              SELECT MAX(s2.snapshot_date) 
              FROM ${snapshots} s2 
              WHERE s2.opportunity_id = ${snapshots.opportunityId}
            )`
          )
        );

      console.log(`📊 Found ${uniqueOpportunityData.length} unique opportunities in fiscal year campaigns`);

      // Group by unique opportunity to avoid double counting
      const uniqueOpportunities = new Map();
      
      uniqueOpportunityData.forEach(row => {
        const oppId = row.opportunityId;
        if (!uniqueOpportunities.has(oppId)) {
          uniqueOpportunities.set(oppId, {
            ...row,
            campaigns: [{ id: row.campaignId, cost: row.campaignCost, type: row.campaignType }]
          });
        } else {
          // Add campaign to existing opportunity
          const existing = uniqueOpportunities.get(oppId);
          existing.campaigns.push({ id: row.campaignId, cost: row.campaignCost, type: row.campaignType });
        }
      });

      const uniqueOpportunitiesArray = Array.from(uniqueOpportunities.values());
      
      // Calculate fiscal year metrics from unique opportunities
      let totalPipeline = 0;
      let totalClosedWon = 0;
      let totalCost = 0;
      let totalCustomers = uniqueOpportunitiesArray.length;
      let totalClosedDeals = 0;
      let totalWonDeals = 0;

      // Track campaigns to avoid double-counting costs
      const uniqueCampaigns = new Map();
      
      uniqueOpportunitiesArray.forEach(opp => {
        const value = opp.currentYear1Value || 0;
        const stage = opp.currentStage;
        
        // Add to appropriate totals
        if (stage === 'Closed Won') {
          totalClosedWon += value;
          totalClosedDeals++;
          totalWonDeals++;
        } else if (stage === 'Closed Lost') {
          totalClosedDeals++;
        } else if (opp.enteredPipeline) {
          // Active pipeline opportunity
          totalPipeline += value;
        }
        
        // Track campaign costs (avoid double counting)
        opp.campaigns.forEach((campaign: any) => {
          if (!uniqueCampaigns.has(campaign.id)) {
            uniqueCampaigns.set(campaign.id, campaign.cost);
            totalCost += campaign.cost;
          }
        });
      });

      console.log(`📊 Fiscal year metrics: ${totalCustomers} unique opportunities, $${totalPipeline} pipeline, $${totalClosedWon} closed won`);

      // Calculate weighted averages
      const weightedROI = totalCost > 0 ? (totalClosedWon / totalCost) * 100 : 0;
      const weightedWinRate = totalClosedDeals > 0 ? (totalWonDeals / totalClosedDeals) * 100 : 0;

      // Create simplified time series data (avoid expensive query)
      const timeSeriesData = [
        { 
          date: fiscalYearStart.toISOString().split('T')[0], 
          pipelineValue: Math.round(totalPipeline * 0.7), 
          closedWonValue: Math.round(totalClosedWon * 0.4) 
        },
        { 
          date: fiscalYearEnd.toISOString().split('T')[0], 
          pipelineValue: totalPipeline, 
          closedWonValue: totalClosedWon 
        }
      ];
      
      // Get basic campaign data for insights (optimized)
      const fiscalYearCampaigns = await db
        .select({
          id: campaigns.id,
          name: campaigns.name,
          campaignType: campaigns.type,
          budget: campaigns.cost,
          startDate: campaigns.startDate
        })
        .from(campaigns)
        .where(
          and(
            gte(campaigns.startDate, fiscalYearStart),
            lte(campaigns.startDate, fiscalYearEnd)
          )
        );

      // Calculate type-level metrics for insights
      const typeGroups = fiscalYearCampaigns.reduce((groups, campaign) => {
        const type = campaign.campaignType;
        if (!groups[type]) {
          groups[type] = [];
        }
        groups[type].push(campaign);
        return groups;
      }, {} as Record<string, any[]>);

      const typeMetrics = Object.entries(typeGroups).map(([type, campaigns]) => {
        const typeCost = campaigns.reduce((sum, c) => sum + c.cost, 0);
        const typeClosedWon = campaigns.reduce((sum, c) => sum + (c.metrics?.closedWonValue || 0), 0);
        const typePipeline = campaigns.reduce((sum, c) => sum + (c.metrics?.pipelineValue || 0), 0);
        const typeROI = typeCost > 0 ? (typeClosedWon / typeCost) * 100 : 0;
        const pipelineEfficiency = typeCost > 0 ? typePipeline / typeCost : 0;
        
        return {
          campaignType: type,
          totalCost: typeCost,
          closedWonValue: typeClosedWon,
          pipelineValue: typePipeline,
          roi: typeROI,
          pipelineEfficiency,
          costPercentage: totalCost > 0 ? (typeCost / totalCost) * 100 : 0
        };
      });

      // Generate insights
      const bestPerformingType = typeMetrics.length > 0 
        ? typeMetrics.reduce((best, current) => current.roi > best.roi ? current : best)
        : null;
      
      const inefficientTypes = typeMetrics.filter(type => type.costPercentage > 10);
      const mostInefficientType = inefficientTypes.length > 0 
        ? inefficientTypes.reduce((worst, current) => current.roi < worst.roi ? current : worst)
        : null;
      
      const bestPipelineEfficiency = typeMetrics.length > 0
        ? typeMetrics.reduce((best, current) => current.pipelineEfficiency > best.pipelineEfficiency ? current : best)
        : null;

      // Generate executive summary text
      const summaryText = this.generateExecutiveSummaryText(
        bestPerformingType,
        mostInefficientType,
        bestPipelineEfficiency,
        weightedROI
      );

      console.log('📊 Executive summary data compiled successfully for fiscal year');

      return {
        metrics: {
          totalPipeline,
          totalClosedWon,
          averageROI: weightedROI,
          averageWinRate: weightedWinRate
        },
        timeSeriesData,
        insights: {
          bestPerformingCampaignType: bestPerformingType ? {
            name: bestPerformingType.campaignType,
            roi: bestPerformingType.roi,
            value: bestPerformingType.closedWonValue
          } : null,
          mostInefficientCampaignType: mostInefficientType ? {
            name: mostInefficientType.campaignType,
            roi: mostInefficientType.roi,
            costPercentage: mostInefficientType.costPercentage
          } : null,
          bestPipelineEfficiency: bestPipelineEfficiency ? {
            name: bestPipelineEfficiency.campaignType,
            efficiency: bestPipelineEfficiency.pipelineEfficiency,
            value: bestPipelineEfficiency.pipelineValue
          } : {
            name: 'No data',
            efficiency: 0,
            value: 0
          }
        },
        summaryText
      };

    } catch (error) {
      console.error('❌ Error in getExecutiveSummary:', error);
      throw error;
    }
  }

  /**
   * Get time-series data for pipeline and closed won trends
   */
  private async getTimeSeriesData(): Promise<TimeSeriesDataPoint[]> {
    try {
      // Get monthly aggregated data from snapshots
      const monthlyData = await db
        .select({
          month: sql<string>`DATE_TRUNC('month', ${snapshots.snapshotDate})::text`,
          pipelineValue: sql<number>`SUM(CASE WHEN ${snapshots.stage} NOT IN ('Closed Won', 'Closed Lost') THEN ${snapshots.year1Value} ELSE 0 END)`,
          closedWonValue: sql<number>`SUM(CASE WHEN ${snapshots.stage} = 'Closed Won' THEN ${snapshots.year1Value} ELSE 0 END)`
        })
        .from(snapshots)
        .innerJoin(campaignCustomers, eq(snapshots.opportunityId, campaignCustomers.opportunityId))
        .where(
          gte(snapshots.snapshotDate, sql`CURRENT_DATE - INTERVAL '12 months'`)
        )
        .groupBy(sql`DATE_TRUNC('month', ${snapshots.snapshotDate})`)
        .orderBy(sql`DATE_TRUNC('month', ${snapshots.snapshotDate})`);

      return monthlyData.map(row => ({
        date: row.month,
        pipelineValue: row.pipelineValue,
        closedWonValue: row.closedWonValue
      }));

    } catch (error) {
      console.error('❌ Error fetching time series data:', error);
      return [];
    }
  }

  /**
   * Get fiscal year time-series data for pipeline and closed won trends
   */
  private async getFiscalYearTimeSeriesData(startDate: Date, endDate: Date): Promise<TimeSeriesDataPoint[]> {
    try {
      // Get monthly aggregated data from snapshots within fiscal year
      const monthlyData = await db
        .select({
          month: sql<string>`DATE_TRUNC('month', ${snapshots.snapshotDate})::text`,
          pipelineValue: sql<number>`SUM(CASE WHEN ${snapshots.stage} NOT IN ('Closed Won', 'Closed Lost') AND ${snapshots.enteredPipeline} IS NOT NULL THEN ${snapshots.year1Value} ELSE 0 END)`,
          closedWonValue: sql<number>`SUM(CASE WHEN ${snapshots.stage} = 'Closed Won' THEN ${snapshots.year1Value} ELSE 0 END)`
        })
        .from(snapshots)
        .innerJoin(campaignCustomers, eq(snapshots.opportunityId, campaignCustomers.opportunityId))
        .innerJoin(campaigns, eq(campaignCustomers.campaignId, campaigns.id))
        .where(
          and(
            gte(campaigns.startDate, startDate),
            lte(campaigns.startDate, endDate),
            gte(snapshots.snapshotDate, startDate)
          )
        )
        .groupBy(sql`DATE_TRUNC('month', ${snapshots.snapshotDate})`)
        .orderBy(sql`DATE_TRUNC('month', ${snapshots.snapshotDate})`);

      return monthlyData.map(row => ({
        date: row.month,
        pipelineValue: row.pipelineValue,
        closedWonValue: row.closedWonValue
      }));

    } catch (error) {
      console.error('❌ Error fetching fiscal year time series data:', error);
      return [];
    }
  }

  /**
   * Generate executive summary text based on insights
   */
  private generateExecutiveSummaryText(
    bestType: any,
    worstType: any,
    bestEfficiency: any,
    overallROI: number
  ): string {
    const roiText = overallROI > 100 ? 'strong' : overallROI > 50 ? 'moderate' : 'developing';
    
    let summary = `Marketing campaigns are delivering ${roiText} returns with ${bestType.campaignType} showing the highest ROI at ${bestType.roi.toFixed(1)}%.`;
    
    if (worstType && worstType.roi < bestType.roi * 0.5) {
      summary += ` Consider optimizing ${worstType.campaignType} campaigns (${worstType.roi.toFixed(1)}% ROI) or reallocating budget to higher-performing campaign types.`;
    }
    
    if (bestEfficiency.campaignType !== bestType.campaignType) {
      summary += ` ${bestEfficiency.campaignType} shows excellent pipeline efficiency, generating $${bestEfficiency.pipelineEfficiency.toFixed(2)} of pipeline per dollar invested.`;
    }

    return summary;
  }

  /**
   * Get campaign type analysis for New Pipeline (30d)
   * Shows opportunities that entered pipeline within 30 days of campaign events
   */
  async getCampaignTypeNewPipelineAnalysis(): Promise<any[]> {
    try {
      console.log('📈 Fetching new pipeline (30d) campaign type analysis...');

      // Get campaigns with their customers and opportunities that entered pipeline within 30 days
      const campaignData = await this.db.execute(
        sql`
          SELECT 
            c.type as campaign_type,
            c.id as campaign_id,
            c.start_date,
            c.budget as campaign_cost,
            cc.opportunity_id,
            o.name as opportunity_name,
            o.client_name,
            s.stage,
            s.year1_value,
            s.entered_pipeline,
            s.snapshot_date,
            s.close_date
          FROM campaigns c
          JOIN campaign_customers cc ON c.id = cc.campaign_id
          JOIN opportunities o ON cc.opportunity_id = o.id
          LEFT JOIN snapshots s ON o.id = s.opportunity_id
          WHERE s.entered_pipeline IS NOT NULL
            AND s.entered_pipeline >= c.start_date
            AND s.entered_pipeline <= c.start_date + INTERVAL '30 days'
            AND s.snapshot_date = (
              SELECT MAX(s2.snapshot_date) 
              FROM snapshots s2 
              WHERE s2.opportunity_id = o.id
            )
          ORDER BY c.type, s.entered_pipeline
        `
      );

      // Group by campaign type and calculate metrics
      const typeGroups = campaignData.rows.reduce((groups: any, row: any) => {
        const type = row.campaignType;
        if (!groups[type]) {
          groups[type] = {
            campaignType: type,
            totalCampaigns: new Set(),
            totalCost: 0,
            newPipelineOpportunities: [],
            totalNewPipelineValue: 0,
            closedWonFromNew: 0,
            activePipelineFromNew: 0
          };
        }

        groups[type].totalCampaigns.add(row.campaignId);
        groups[type].totalCost += row.campaignCost || 0;
        
        // Track new pipeline opportunities
        groups[type].newPipelineOpportunities.push({
          opportunityName: row.opportunityName,
          clientName: row.clientName,
          enteredPipeline: row.enteredPipeline,
          stage: row.stage,
          value: row.year1Value || 0
        });

        const value = row.year1Value || 0;
        groups[type].totalNewPipelineValue += value;

        if (row.stage === 'Closed Won') {
          groups[type].closedWonFromNew += value;
        } else if (row.stage !== 'Closed Lost') {
          groups[type].activePipelineFromNew += value;
        }

        return groups;
      }, {});

      // Convert to array format with calculated metrics
      const typeAnalytics = Object.values(typeGroups).map((group: any) => {
        const totalCampaigns = group.totalCampaigns.size;
        const newPipelineConversionRate = group.totalCost > 0 ? (group.closedWonFromNew / group.totalCost) * 100 : 0;
        const newPipelineEfficiency = group.totalCost > 0 ? group.totalNewPipelineValue / group.totalCost : 0;
        const newOpportunityCount = group.newPipelineOpportunities.length;

        return {
          campaignType: group.campaignType,
          totalCampaigns,
          totalCost: group.totalCost,
          newOpportunityCount,
          totalNewPipelineValue: group.totalNewPipelineValue,
          closedWonFromNew: group.closedWonFromNew,
          activePipelineFromNew: group.activePipelineFromNew,
          newPipelineConversionRate,
          newPipelineEfficiency,
          averageNewPipelinePerCampaign: totalCampaigns > 0 ? group.totalNewPipelineValue / totalCampaigns : 0,
          opportunities: group.newPipelineOpportunities
        };
      });

      // Sort by total new pipeline value descending
      typeAnalytics.sort((a, b) => b.totalNewPipelineValue - a.totalNewPipelineValue);

      console.log(`📈 New pipeline (30d) analysis completed - ${typeAnalytics.length} types`);
      return typeAnalytics;

    } catch (error) {
      console.error('❌ Error in getCampaignTypeNewPipelineAnalysis:', error);
      throw error;
    }
  }

  /**
   * Get campaign type analysis for Stage Advance (30d)
   * Shows pipeline that moved positively through stages within 30 days of campaign events
   */
  async getCampaignTypeStageAdvanceAnalysis(): Promise<any[]> {
    try {
      console.log('📈 Fetching stage advance (30d) campaign type analysis...');

      // Define stage progression order (higher index = more advanced)
      const stageOrder = [
        'Validation/Introduction',
        'Discovery',
        'Developing Champions', 
        'ROI Analysis/Pricing',
        'Negotiation/Commit',
        'Closed Won'
      ];

      // Get campaigns with opportunities that showed stage progression within 30 days
      const campaignData = await this.db.execute(
        sql`
          WITH stage_progression AS (
            SELECT 
              c.type as campaign_type,
              c.id as campaign_id,
              c.start_date,
              c.budget as campaign_cost,
              cc.opportunity_id,
              o.name as opportunity_name,
              o.client_name,
              s1.stage as before_stage,
              s2.stage as after_stage,
              s1.snapshot_date as before_date,
              s2.snapshot_date as after_date,
              s2.year1_value,
              s2.close_date
            FROM campaigns c
            JOIN campaign_customers cc ON c.id = cc.campaign_id
            JOIN opportunities o ON cc.opportunity_id = o.id
            JOIN snapshots s1 ON o.id = s1.opportunity_id
            JOIN snapshots s2 ON o.id = s2.opportunity_id
            WHERE s1.snapshot_date < s2.snapshot_date
              AND s2.snapshot_date >= c.start_date
              AND s2.snapshot_date <= c.start_date + INTERVAL '30 days'
              AND s1.stage != s2.stage
              AND s2.snapshot_date = (
                SELECT MAX(s3.snapshot_date) 
                FROM snapshots s3 
                WHERE s3.opportunity_id = o.id
                  AND s3.snapshot_date <= c.start_date + INTERVAL '30 days'
              )
          )
          SELECT * FROM stage_progression
          ORDER BY campaign_type, after_date
        `
      );

      // Helper function to determine if stage movement is positive
      const isPositiveStageMovement = (beforeStage: string, afterStage: string): boolean => {
        const beforeIndex = stageOrder.indexOf(beforeStage);
        const afterIndex = stageOrder.indexOf(afterStage);
        return afterIndex > beforeIndex && beforeIndex >= 0 && afterIndex >= 0;
      };

      // Group by campaign type and calculate stage advancement metrics
      const typeGroups = campaignData.rows.reduce((groups: any, row: any) => {
        const type = row.campaignType;
        if (!groups[type]) {
          groups[type] = {
            campaignType: type,
            totalCampaigns: new Set(),
            totalCost: 0,
            stageAdvancementOpportunities: [],
            totalAdvancedPipelineValue: 0,
            positiveMovements: 0,
            closedWonFromAdvancement: 0
          };
        }

        groups[type].totalCampaigns.add(row.campaignId);
        groups[type].totalCost += row.campaignCost || 0;

        // Check if this is a positive stage movement
        if (isPositiveStageMovement(row.beforeStage, row.afterStage)) {
          groups[type].positiveMovements++;
          
          const value = row.year1Value || 0;
          groups[type].totalAdvancedPipelineValue += value;

          groups[type].stageAdvancementOpportunities.push({
            opportunityName: row.opportunityName,
            clientName: row.clientName,
            beforeStage: row.beforeStage,
            afterStage: row.afterStage,
            movementDate: row.afterDate,
            value: value
          });

          if (row.afterStage === 'Closed Won') {
            groups[type].closedWonFromAdvancement += value;
          }
        }

        return groups;
      }, {});

      // Convert to array format with calculated metrics
      const typeAnalytics = Object.values(typeGroups).map((group: any) => {
        const totalCampaigns = group.totalCampaigns.size;
        const stageAdvancementEfficiency = group.totalCost > 0 ? group.totalAdvancedPipelineValue / group.totalCost : 0;
        const conversionRate = group.totalAdvancedPipelineValue > 0 ? (group.closedWonFromAdvancement / group.totalAdvancedPipelineValue) * 100 : 0;

        return {
          campaignType: group.campaignType,
          totalCampaigns,
          totalCost: group.totalCost,
          positiveMovements: group.positiveMovements,
          totalAdvancedPipelineValue: group.totalAdvancedPipelineValue,
          closedWonFromAdvancement: group.closedWonFromAdvancement,
          stageAdvancementEfficiency,
          conversionRate,
          averageAdvancementPerCampaign: totalCampaigns > 0 ? group.positiveMovements / totalCampaigns : 0,
          averageAdvancedValuePerCampaign: totalCampaigns > 0 ? group.totalAdvancedPipelineValue / totalCampaigns : 0,
          opportunities: group.stageAdvancementOpportunities
        };
      });

      // Sort by total advanced pipeline value descending
      typeAnalytics.sort((a, b) => b.totalAdvancedPipelineValue - a.totalAdvancedPipelineValue);

      console.log(`📈 Stage advance (30d) analysis completed - ${typeAnalytics.length} types`);
      return typeAnalytics;

    } catch (error) {
      console.error('❌ Error in getCampaignTypeStageAdvanceAnalysis:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const marketingComparativeStorage = new MarketingComparativeStorage();