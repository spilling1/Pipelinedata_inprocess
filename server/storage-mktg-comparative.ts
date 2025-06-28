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
  
  /**
   * Get comprehensive target account vs non-target account analytics
   */
  async getTargetAccountAnalytics(): Promise<TargetAccountAnalytics> {
    try {
      console.log('🎯 Fetching target account analytics...');
      
      // Get all campaign customers with their current snapshot data
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
          and(
            eq(campaignCustomers.opportunityId, snapshots.opportunityId),
            // Get most recent snapshot for each opportunity
            eq(snapshots.snapshotDate, 
              sql`(SELECT MAX(s2.snapshot_date) FROM snapshots s2 WHERE s2.opportunity_id = ${snapshots.opportunityId})`
            )
          )
        )
        .where(isNotNull(snapshots.targetAccount));

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

      // Get campaign customers with attendee data and current snapshots
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
          and(
            eq(campaignCustomers.opportunityId, snapshots.opportunityId),
            eq(snapshots.snapshotDate,
              sql`(SELECT MAX(s2.snapshot_date) FROM snapshots s2 WHERE s2.opportunity_id = ${snapshots.opportunityId})`
            )
          )
        )
        .where(isNotNull(campaignCustomers.attendees));

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

      // Get campaign customers with target account flags, attendee data, and performance metrics
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
          and(
            eq(campaignCustomers.opportunityId, snapshots.opportunityId),
            eq(snapshots.snapshotDate,
              sql`(SELECT MAX(s2.snapshot_date) FROM snapshots s2 WHERE s2.opportunity_id = ${snapshots.opportunityId})`
            )
          )
        )
        .where(
          and(
            isNotNull(campaignCustomers.attendees),
            isNotNull(snapshots.targetAccount)
          )
        );

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
    // Get campaign customers and their current snapshots
    const campaignData = await db
      .select({
        attendees: campaignCustomers.attendees,
        targetAccount: snapshots.targetAccount,
        currentYear1Value: snapshots.year1Value,
        currentStage: snapshots.stage,
      })
      .from(campaignCustomers)
      .innerJoin(
        snapshots,
        and(
          eq(campaignCustomers.opportunityId, snapshots.opportunityId),
          eq(snapshots.snapshotDate,
            sql`(SELECT MAX(s2.snapshot_date) FROM snapshots s2 WHERE s2.opportunity_id = ${snapshots.opportunityId})`
          )
        )
      )
      .where(eq(campaignCustomers.campaignId, campaignId));

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
    
    const cac = closedWonCustomers.length > 0 ? campaignCost / closedWonCustomers.length : 0;
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
      attendeeEfficiency
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