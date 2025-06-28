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
    // Use the corrected marketing storage analytics instead of reimplementing
    const { marketingStorage } = await import('./storage-mktg.js');
    
    try {
      // Get the corrected campaign analytics that exclude closed lost and apply proper filtering
      const analytics = await marketingStorage.getCampaignAnalytics(campaignId);
      
      // Get campaign customers using the same customer-centric grouping as individual analytics
      const campaignCustomersData = await marketingStorage.getCampaignCustomers(campaignId);
      
      // Get attendee data from campaign_customers table
      const attendeeData = await db
        .select({
          opportunityId: campaignCustomers.opportunityId,
          attendees: campaignCustomers.attendees,
        })
        .from(campaignCustomers)
        .where(eq(campaignCustomers.campaignId, campaignId));

      // Get target account data (for customers with current snapshots)
      const targetAccountSnapshots = await db
        .select({
          targetAccount: snapshots.targetAccount,
        })
        .from(campaignCustomers)
        .innerJoin(
          snapshots,
          eq(campaignCustomers.opportunityId, snapshots.opportunityId)
        )
        .where(
          and(
            eq(campaignCustomers.campaignId, campaignId),
            gte(snapshots.snapshotDate, sql`CURRENT_DATE - INTERVAL '30 days'`)
          )
        )
        .orderBy(desc(snapshots.snapshotDate));

      const totalCustomers = campaignCustomersData.length; // Use customer-centric count
      const targetAccountCustomers = targetAccountSnapshots.filter(row => row.targetAccount === 1).length;
      const totalAttendees = attendeeData.reduce((sum, row) => sum + (row.attendees || 0), 0);
      const averageAttendees = totalCustomers > 0 ? totalAttendees / totalCustomers : 0;

      // Use the corrected analytics values
      const pipelineValue = analytics.totalCampaignPipeline; // Now correctly excludes closed lost
      const closedWonValue = analytics.currentClosedWon.value;
      const winRate = analytics.currentWinRate * 100; // Convert to percentage

      // Calculate target account win rate (simplified for now)
      const targetAccountWinRate = targetAccountSnapshots.length > 0 ? winRate : 0; // Use overall win rate for now
      // Remove the duplicate line that was causing errors

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
      const customersQuery = `
        SELECT DISTINCT
          o.id as opportunity_id,
          o.name as customer_name,
          o.opportunity_id as opportunity_id_string,
          cc.campaign_id,
          c.name as campaign_name,
          c.type as campaign_type,
          c.cost_per_customer,
          c.start_date,
          cc.snapshot_date as first_touch_date
        FROM opportunities o
        INNER JOIN campaign_customers cc ON o.id = cc.opportunity_id
        INNER JOIN campaigns c ON cc.campaign_id = c.id
        ORDER BY o.name, c.start_date
      `;

      const customerCampaignData = await this.db.execute(customersQuery);

      // Get latest snapshot data for each customer
      const snapshotQuery = `
        SELECT DISTINCT ON (s.opportunity_id)
          s.opportunity_id,
          s.stage,
          s.year1_arr,
          s.snapshot_date,
          s.close_date
        FROM snapshots s
        ORDER BY s.opportunity_id, s.snapshot_date DESC
      `;

      const latestSnapshots = await this.db.execute(snapshotQuery);
      const snapshotMap = new Map(latestSnapshots.map(s => [s.opportunity_id, s]));

      // Group by customer and calculate metrics
      const customerMap = new Map();

      for (const row of customerCampaignData) {
        const customerId = row.opportunity_id;
        const snapshot = snapshotMap.get(customerId);
        
        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            customerName: row.customer_name,
            opportunityId: customerId,
            campaigns: [],
            totalTouches: 0,
            totalCAC: 0,
            currentStage: snapshot?.stage || 'Unknown',
            pipelineValue: snapshot?.year1_arr || 0,
            closedWonValue: snapshot?.stage === 'Closed Won' ? (snapshot?.year1_arr || 0) : 0,
            isClosedWon: snapshot?.stage === 'Closed Won',
            isClosedLost: snapshot?.stage === 'Closed Lost',
            firstTouchDate: row.first_touch_date,
            lastTouchDate: row.first_touch_date,
            closeDate: snapshot?.close_date
          });
        }

        const customer = customerMap.get(customerId);
        
        // Add campaign to customer
        customer.campaigns.push({
          campaignId: row.campaign_id,
          campaignName: row.campaign_name,
          campaignType: row.campaign_type,
          cost: row.cost_per_customer || 0,
          startDate: row.start_date
        });

        // Update metrics
        customer.totalCAC += (row.cost_per_customer || 0);
        customer.totalTouches = customer.campaigns.length;
        
        // Update touch date range
        if (new Date(row.first_touch_date) < new Date(customer.firstTouchDate)) {
          customer.firstTouchDate = row.first_touch_date;
        }
        if (new Date(row.first_touch_date) > new Date(customer.lastTouchDate)) {
          customer.lastTouchDate = row.first_touch_date;
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

      console.log(`🎯🛤️ Customer journey analysis completed: ${totalCustomers} customers, avg ${averageTouchesPerCustomer.toFixed(1)} touches per customer`);

      return {
        customers,
        summary
      };

    } catch (error) {
      console.error('❌ Error in getCustomerJourneyAnalysis:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const marketingComparativeStorage = new MarketingComparativeStorage();