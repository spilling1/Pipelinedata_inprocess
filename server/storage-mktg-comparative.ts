import { db } from './db.js';
import { campaigns, campaignCustomers, snapshots, opportunities } from '../shared/schema.js';
import { eq, and, sql, desc, asc, isNotNull, gte, lte, inArray } from 'drizzle-orm';

// Type definitions for comparative analytics
export interface TargetAccountAnalytics {
  targetAccounts: {
    totalCustomers: number;
    totalPipelineValue: number;
    averageDealSize: number;
    winRate: number;
    averageAttendees: number;
  };
  nonTargetAccounts: {
    totalCustomers: number;
    totalPipelineValue: number;
    averageDealSize: number;
    winRate: number;
    averageAttendees: number;
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
    uniqueOpportunities: number;
    sharedOpportunities: number;
    influenceRate: number;
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
    campaignInfluenceScore: number;
    // Campaign influence metrics
    closeAcceleration: {
      closedWithin30Days: number;
      averageDaysToClose: number;
      accelerationRate: number;
    };
    stageProgression: {
      advancedStages: number;
      stageAdvancementRate: number;
      averageDaysToAdvance: number;
    };
    touchPointEffectiveness: {
      averageTouchPoints: number;
      touchPointCloseRate: number;
      singleTouchCloseRate: number;
      multiTouchCloseRate: number;
    };
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

export interface TeamAttendeeEffectiveness {
  attendeePerformance: Array<{
    attendeeName: string;
    role: string;
    campaignsAttended: number;
    totalOpportunities: number;
    totalPipelineValue: number;
    closedWonDeals: number;
    closedWonValue: number;
    winRate: number;
    averageDealSize: number;
    pipelinePerCampaign: number;
    closeRate: number;
    campaignTypes: string[]; // Array of campaign types attended
  }>;
  roleAnalysis: Array<{
    role: string;
    attendeeCount: number;
    totalCampaigns: number;
    averagePipelinePerAttendee: number;
    averageWinRate: number;
    mostEffectiveAttendee: string;
    roleEfficiencyScore: number;
  }>;
  insights: {
    topPipelineCreator: {
      name: string;
      role: string;
      pipelineValue: number;
    };
    topCloser: {
      name: string;
      role: string;
      winRate: number;
      closedValue: number;
    };
    mostVersatile: {
      name: string;
      role: string;
      campaignTypesCount: number;
    };
  };
}

export class MarketingComparativeStorage {
  
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
            // Simple approach: use most recent snapshot available
            gte(snapshots.snapshotDate, sql`CURRENT_DATE - INTERVAL '30 days'`)
          )
        )
        .orderBy(desc(snapshots.snapshotDate));

      // Separate target accounts (1) from non-target accounts (0)
      const targetAccountData = campaignCustomersData.filter(row => row.targetAccount === 1);
      const nonTargetAccountData = campaignCustomersData.filter(row => row.targetAccount === 0);

      // Calculate metrics for target accounts
      const targetMetrics = this.calculateAccountTypeMetrics(targetAccountData);
      
      // Calculate metrics for non-target accounts  
      const nonTargetMetrics = this.calculateAccountTypeMetrics(nonTargetAccountData);

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
    const totalCustomers = data.length;
    const totalPipelineValue = data.reduce((sum, row) => sum + (row.currentYear1Value || 0), 0);
    const averageDealSize = totalCustomers > 0 ? totalPipelineValue / totalCustomers : 0;
    
    const closedWonCustomers = data.filter(row => 
      row.currentStage && row.currentStage.toLowerCase().includes('closed won')
    ).length;
    const closedLostCustomers = data.filter(row => 
      row.currentStage && row.currentStage.toLowerCase().includes('closed lost')
    ).length;
    const winRate = (closedWonCustomers + closedLostCustomers) > 0 ? 
      (closedWonCustomers / (closedWonCustomers + closedLostCustomers)) * 100 : 0;

    const totalAttendees = data.reduce((sum, row) => sum + (row.attendees || 0), 0);
    const averageAttendees = totalCustomers > 0 ? totalAttendees / totalCustomers : 0;

    return {
      totalCustomers,
      totalPipelineValue,
      averageDealSize,
      winRate,
      averageAttendees
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
    // Get campaign start date for influence tracking
    const campaignInfo = await db
      .select({ startDate: campaigns.startDate })
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1);
    const campaignStartDate = campaignInfo[0]?.startDate;

    // Get campaign customers with current and historical snapshots for influence tracking
    const campaignData = await db
      .select({
        opportunityId: campaignCustomers.opportunityId,
        attendees: campaignCustomers.attendees,
        targetAccount: snapshots.targetAccount,
        currentYear1Value: snapshots.year1Value,
        currentStage: snapshots.stage,
        snapshotDate: snapshots.snapshotDate,
        closeDate: snapshots.closeDate,
      })
      .from(campaignCustomers)
      .innerJoin(
        snapshots,
        eq(campaignCustomers.opportunityId, snapshots.opportunityId)
      )
      .where(
        and(
          eq(campaignCustomers.campaignId, campaignId),
          gte(snapshots.snapshotDate, sql`CURRENT_DATE - INTERVAL '60 days'`)
        )
      )
      .orderBy(desc(snapshots.snapshotDate));

    // Get cross-campaign touch point data
    const touchPointData = await db
      .select({
        opportunityId: campaignCustomers.opportunityId,
        campaignCount: sql`COUNT(DISTINCT ${campaignCustomers.campaignId})`.as('campaignCount'),
        campaignNames: sql`STRING_AGG(DISTINCT ${campaigns.name}, ', ')`.as('campaignNames'),
      })
      .from(campaignCustomers)
      .innerJoin(campaigns, eq(campaignCustomers.campaignId, campaigns.id))
      .where(
        inArray(
          campaignCustomers.opportunityId,
          campaignData.map(row => row.opportunityId)
        )
      )
      .groupBy(campaignCustomers.opportunityId);

    // Get stage progression data for influence analysis
    const stageProgressionData = await db
      .select({
        opportunityId: snapshots.opportunityId,
        stage: snapshots.stage,
        snapshotDate: snapshots.snapshotDate,
        preCampaignStage: sql`
          LAG(${snapshots.stage}) OVER (
            PARTITION BY ${snapshots.opportunityId} 
            ORDER BY ${snapshots.snapshotDate}
          )
        `.as('preCampaignStage'),
        preCampaignDate: sql`
          LAG(${snapshots.snapshotDate}) OVER (
            PARTITION BY ${snapshots.opportunityId} 
            ORDER BY ${snapshots.snapshotDate}
          )
        `.as('preCampaignDate'),
      })
      .from(snapshots)
      .where(
        and(
          inArray(
            snapshots.opportunityId,
            campaignData.map(row => row.opportunityId)
          ),
          gte(snapshots.snapshotDate, sql`CURRENT_DATE - INTERVAL '90 days'`)
        )
      )
      .orderBy(snapshots.opportunityId, snapshots.snapshotDate);

    const totalCustomers = campaignData.length;
    const targetAccountCustomers = campaignData.filter(row => row.targetAccount === 1).length;
    const totalAttendees = campaignData.reduce((sum, row) => sum + (row.attendees || 0), 0);
    const averageAttendees = totalCustomers > 0 ? totalAttendees / totalCustomers : 0;
    
    const pipelineValue = campaignData.reduce((sum, row) => sum + (row.currentYear1Value || 0), 0);
    
    const closedWonCustomers = campaignData.filter(row => 
      row.currentStage && row.currentStage.toLowerCase().includes('closed won')
    );
    const closedWonValue = closedWonCustomers.reduce((sum, row) => sum + (row.currentYear1Value || 0), 0);
    
    const closedLostCustomers = campaignData.filter(row => 
      row.currentStage && row.currentStage.toLowerCase().includes('closed lost')
    ).length;
    
    const winRate = (closedWonCustomers.length + closedLostCustomers) > 0 ? 
      (closedWonCustomers.length / (closedWonCustomers.length + closedLostCustomers)) * 100 : 0;

    // Target account specific win rate
    const targetAccountData = campaignData.filter(row => row.targetAccount === 1);
    const targetClosedWon = targetAccountData.filter(row => 
      row.currentStage && row.currentStage.toLowerCase().includes('closed won')
    ).length;
    const targetClosedLost = targetAccountData.filter(row => 
      row.currentStage && row.currentStage.toLowerCase().includes('closed lost')
    ).length;
    const targetAccountWinRate = (targetClosedWon + targetClosedLost) > 0 ? 
      (targetClosedWon / (targetClosedWon + targetClosedLost)) * 100 : 0;

    // Get campaign cost for calculations
    const campaign = await db.select({ cost: campaigns.cost }).from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
    const campaignCost = campaign[0]?.cost || 0;
    
    // Multi-touch attribution calculations
    const uniqueOpportunities = new Set(campaignData.map(row => row.opportunityId)).size;
    const sharedOpportunities = campaignData.filter(row => {
      const touchPoint = touchPointData.find(tp => tp.opportunityId === row.opportunityId);
      return touchPoint && Number(touchPoint.campaignCount) > 1;
    }).length;
    
    const influenceRate = totalCustomers > 0 ? (sharedOpportunities / totalCustomers) * 100 : 0;
    
    // Campaign influence score: weighs unique opportunities higher than shared ones
    const campaignInfluenceScore = (uniqueOpportunities - sharedOpportunities) * 1.0 + 
                                   (sharedOpportunities * 0.5); // Shared opportunities get 50% weight

    // Close Date Acceleration Analysis (within 30 days of campaign)
    const closedWithin30Days = closedWonCustomers.filter(row => {
      if (!row.closeDate || !campaignStartDate) return false;
      const daysDiff = Math.abs(new Date(row.closeDate).getTime() - new Date(campaignStartDate).getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 30;
    }).length;

    const closedWonWithDates = closedWonCustomers.filter(row => row.closeDate && campaignStartDate);
    const averageDaysToClose = closedWonWithDates.length > 0 ? 
      closedWonWithDates.reduce((sum, row) => {
        const daysDiff = Math.abs(new Date(row.closeDate!).getTime() - new Date(campaignStartDate!).getTime()) / (1000 * 60 * 60 * 24);
        return sum + daysDiff;
      }, 0) / closedWonWithDates.length : 0;

    const accelerationRate = closedWonCustomers.length > 0 ? (closedWithin30Days / closedWonCustomers.length) * 100 : 0;

    // Stage Progression Analysis 
    const stageAdvancedOpportunities = stageProgressionData.filter(row => {
      if (!row.preCampaignStage || !campaignStartDate) return false;
      const progressionDate = new Date(row.snapshotDate);
      const campaignDate = new Date(campaignStartDate);
      const daysSinceCampaign = (progressionDate.getTime() - campaignDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // Check if stage changed within 30 days of campaign and progressed forward
      return daysSinceCampaign <= 30 && daysSinceCampaign >= 0 && 
             row.stage !== row.preCampaignStage && 
             !row.stage?.toLowerCase().includes('closed lost');
    });

    const advancedStages = stageAdvancedOpportunities.length;
    const stageAdvancementRate = totalCustomers > 0 ? (advancedStages / totalCustomers) * 100 : 0;
    const averageDaysToAdvance = stageAdvancedOpportunities.length > 0 ?
      stageAdvancedOpportunities.reduce((sum, row) => {
        const daysDiff = Math.abs(new Date(row.snapshotDate).getTime() - new Date(campaignStartDate!).getTime()) / (1000 * 60 * 60 * 24);
        return sum + daysDiff;
      }, 0) / stageAdvancedOpportunities.length : 0;

    // Touch Point Effectiveness Analysis
    const averageTouchPoints = touchPointData.length > 0 ? 
      touchPointData.reduce((sum, tp) => sum + Number(tp.campaignCount), 0) / touchPointData.length : 0;

    const singleTouchOpportunities = touchPointData.filter(tp => Number(tp.campaignCount) === 1);
    const multiTouchOpportunities = touchPointData.filter(tp => Number(tp.campaignCount) > 1);

    const singleTouchClosed = singleTouchOpportunities.filter(st => {
      return closedWonCustomers.some(closed => closed.opportunityId === st.opportunityId);
    }).length;

    const multiTouchClosed = multiTouchOpportunities.filter(mt => {
      return closedWonCustomers.some(closed => closed.opportunityId === mt.opportunityId);
    }).length;

    const singleTouchCloseRate = singleTouchOpportunities.length > 0 ? (singleTouchClosed / singleTouchOpportunities.length) * 100 : 0;
    const multiTouchCloseRate = multiTouchOpportunities.length > 0 ? (multiTouchClosed / multiTouchOpportunities.length) * 100 : 0;
    const touchPointCloseRate = touchPointData.length > 0 ? ((singleTouchClosed + multiTouchClosed) / touchPointData.length) * 100 : 0;

    const cac = closedWonCustomers.length > 0 ? campaignCost / closedWonCustomers.length : 0;
    const roi = campaignCost > 0 ? (closedWonValue / campaignCost) * 100 : 0;
    const pipelineEfficiency = campaignCost > 0 ? pipelineValue / campaignCost : 0;
    const attendeeEfficiency = totalAttendees > 0 ? pipelineValue / totalAttendees : 0;

    return {
      totalCustomers,
      uniqueOpportunities,
      sharedOpportunities,
      influenceRate,
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
      campaignInfluenceScore,
      closeAcceleration: {
        closedWithin30Days,
        averageDaysToClose,
        accelerationRate
      },
      stageProgression: {
        advancedStages,
        stageAdvancementRate,
        averageDaysToAdvance
      },
      touchPointEffectiveness: {
        averageTouchPoints,
        touchPointCloseRate,
        singleTouchCloseRate,
        multiTouchCloseRate
      }
    };
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
}

// Export singleton instance
export const marketingComparativeStorage = new MarketingComparativeStorage();