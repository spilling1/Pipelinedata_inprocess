import { Router } from 'express';
import { marketingComparativeStorage } from './storage-mktg-comparative.js';

const router = Router();

/**
 * Get target account vs non-target account analytics
 * Provides comparative analysis of target accounts vs regular accounts
 */
router.get('/target-accounts', async (req, res) => {
  try {
    console.log('🎯 API: Fetching target account analytics...');
    
    const analytics = await marketingComparativeStorage.getTargetAccountAnalytics();
    
    console.log('🎯 API: Target account analytics completed successfully');
    res.json(analytics);
    
  } catch (error) {
    console.error('❌ API Error in /target-accounts:', error);
    res.status(500).json({ 
      error: 'Failed to fetch target account analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get attendee effectiveness analysis
 * Analyzes campaign performance by attendee count ranges
 */
router.get('/attendee-effectiveness', async (req, res) => {
  try {
    console.log('👥 API: Fetching attendee effectiveness data...');
    
    const effectiveness = await marketingComparativeStorage.getAttendeeEffectivenessData();
    
    console.log('👥 API: Attendee effectiveness analysis completed');
    res.json(effectiveness);
    
  } catch (error) {
    console.error('❌ API Error in /attendee-effectiveness:', error);
    res.status(500).json({ 
      error: 'Failed to fetch attendee effectiveness data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get campaign comparison data
 * Returns comprehensive comparison metrics for all campaigns
 */
router.get('/campaign-comparison', async (req, res) => {
  try {
    console.log('📊 API: Fetching campaign comparison data...');
    
    // Optional query parameters for filtering
    const { campaignType, startDate, endDate } = req.query;
    
    const comparisonData = await marketingComparativeStorage.getCampaignComparisonData();
    
    // Apply filters if provided
    let filteredData = comparisonData;
    
    if (campaignType) {
      filteredData = filteredData.filter(campaign => 
        campaign.campaignType.toLowerCase() === (campaignType as string).toLowerCase()
      );
    }
    
    if (startDate) {
      const filterStartDate = new Date(startDate as string);
      filteredData = filteredData.filter(campaign => 
        campaign.startDate >= filterStartDate
      );
    }
    
    if (endDate) {
      const filterEndDate = new Date(endDate as string);
      filteredData = filteredData.filter(campaign => 
        !campaign.endDate || campaign.endDate <= filterEndDate
      );
    }
    
    console.log(`📊 API: Campaign comparison completed - ${filteredData.length} campaigns`);
    res.json(filteredData);
    
  } catch (error) {
    console.error('❌ API Error in /campaign-comparison:', error);
    res.status(500).json({ 
      error: 'Failed to fetch campaign comparison data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get team attendee effectiveness analysis
 * Analyzes which team members create and close the most pipeline
 */
router.get('/team-attendee-effectiveness', async (req, res) => {
  try {
    console.log('📊 API: Fetching team attendee effectiveness analysis...');
    const effectiveness = await marketingComparativeStorage.getTeamAttendeeEffectiveness();
    console.log('📊 Team attendee effectiveness analysis completed');
    res.json(effectiveness);
  } catch (error) {
    console.error('❌ Error fetching team attendee effectiveness:', error);
    res.status(500).json({ error: 'Failed to fetch team attendee effectiveness' });
  }
});

/**
 * Get strategic engagement matrix
 * Combines target account and attendee analysis for optimal strategy recommendations
 */
router.get('/strategic-matrix', async (req, res) => {
  try {
    console.log('🎯👥 API: Fetching strategic engagement matrix...');
    
    const matrix = await marketingComparativeStorage.getStrategicEngagementMatrix();
    
    console.log('🎯👥 API: Strategic engagement matrix completed');
    res.json(matrix);
    
  } catch (error) {
    console.error('❌ API Error in /strategic-matrix:', error);
    res.status(500).json({ 
      error: 'Failed to fetch strategic engagement matrix',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get campaign type analytics
 * Aggregated performance analysis by campaign type
 */
router.get('/campaign-types', async (req, res) => {
  try {
    console.log('📈 API: Fetching campaign type analytics...');
    
    // Get campaign comparison data and aggregate by type
    const campaignData = await marketingComparativeStorage.getCampaignComparisonData();
    
    // Group campaigns by type
    const typeGroups = campaignData.reduce((groups, campaign) => {
      const type = campaign.campaignType;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(campaign);
      return groups;
    }, {} as Record<string, typeof campaignData>);
    
    // Calculate aggregated metrics for each type
    const typeAnalytics = Object.entries(typeGroups).map(([type, campaigns]) => {
      const totalCampaigns = campaigns.length;
      const totalCost = campaigns.reduce((sum, c) => sum + c.cost, 0);
      const totalCustomers = campaigns.reduce((sum, c) => sum + c.metrics.totalCustomers, 0);
      const totalTargetCustomers = campaigns.reduce((sum, c) => sum + c.metrics.targetAccountCustomers, 0);
      const totalPipelineValue = campaigns.reduce((sum, c) => sum + c.metrics.pipelineValue, 0);
      const totalClosedWonValue = campaigns.reduce((sum, c) => sum + c.metrics.closedWonValue, 0);
      const totalAttendees = campaigns.reduce((sum, c) => sum + c.metrics.totalAttendees, 0);
      
      const avgWinRate = campaigns.reduce((sum, c) => sum + c.metrics.winRate, 0) / totalCampaigns;
      const avgROI = campaigns.reduce((sum, c) => sum + c.metrics.roi, 0) / totalCampaigns;
      const avgTargetAccountWinRate = campaigns.reduce((sum, c) => sum + c.metrics.targetAccountWinRate, 0) / totalCampaigns;
      
      const costEfficiency = totalCost > 0 ? totalPipelineValue / totalCost : 0;
      const attendeeEfficiency = totalAttendees > 0 ? totalPipelineValue / totalAttendees : 0;
      const targetAccountPercentage = totalCustomers > 0 ? (totalTargetCustomers / totalCustomers) * 100 : 0;
      
      return {
        campaignType: type,
        totalCampaigns,
        totalCost,
        totalCustomers,
        totalTargetCustomers,
        targetAccountPercentage,
        totalPipelineValue,
        totalClosedWonValue,
        totalAttendees,
        averageWinRate: avgWinRate,
        averageROI: avgROI,
        averageTargetAccountWinRate: avgTargetAccountWinRate,
        costEfficiency,
        attendeeEfficiency,
        averageCostPerCampaign: totalCampaigns > 0 ? totalCost / totalCampaigns : 0,
        averageCustomersPerCampaign: totalCampaigns > 0 ? totalCustomers / totalCampaigns : 0,
        averageAttendeesPerCampaign: totalCampaigns > 0 ? totalAttendees / totalCampaigns : 0
      };
    });
    
    // Sort by total pipeline value descending
    typeAnalytics.sort((a, b) => b.totalPipelineValue - a.totalPipelineValue);
    
    console.log(`📈 API: Campaign type analytics completed - ${typeAnalytics.length} types`);
    res.json(typeAnalytics);
    
  } catch (error) {
    console.error('❌ API Error in /campaign-types:', error);
    res.status(500).json({ 
      error: 'Failed to fetch campaign type analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get summary dashboard data
 * High-level overview combining all comparative analytics
 */
router.get('/dashboard-summary', async (req, res) => {
  try {
    console.log('🎯 API: Fetching comparative analytics dashboard summary...');
    
    // Fetch all data concurrently
    const [
      targetAccountAnalytics,
      attendeeEffectiveness,
      campaignComparison,
      strategicMatrix
    ] = await Promise.all([
      marketingComparativeStorage.getTargetAccountAnalytics(),
      marketingComparativeStorage.getAttendeeEffectivenessData(),
      marketingComparativeStorage.getCampaignComparisonData(),
      marketingComparativeStorage.getStrategicEngagementMatrix()
    ]);
    
    // Calculate summary insights
    const totalCampaigns = campaignComparison.length;
    const totalInvestment = campaignComparison.reduce((sum, c) => sum + c.cost, 0);
    const totalPipelineValue = campaignComparison.reduce((sum, c) => sum + c.metrics.pipelineValue, 0);
    const avgROI = campaignComparison.reduce((sum, c) => sum + c.metrics.roi, 0) / totalCampaigns;
    
    const summary = {
      overview: {
        totalCampaigns,
        totalInvestment,
        totalPipelineValue,
        averageROI: avgROI,
        pipelineEfficiency: totalInvestment > 0 ? totalPipelineValue / totalInvestment : 0
      },
      targetAccountInsights: {
        dealSizeAdvantage: targetAccountAnalytics.comparison.targetAccountAdvantage.dealSizeMultiplier,
        winRateAdvantage: targetAccountAnalytics.comparison.targetAccountAdvantage.winRateAdvantage,
        attendeeEfficiency: targetAccountAnalytics.comparison.targetAccountAdvantage.attendeeEfficiency
      },
      attendeeOptimization: {
        optimalRange: attendeeEffectiveness.optimalRange.attendeeCount,
        optimalEfficiency: attendeeEffectiveness.optimalRange.efficiency,
        recommendation: attendeeEffectiveness.optimalRange.recommendation
      },
      strategicRecommendations: strategicMatrix.recommendations,
      topPerformingCampaigns: campaignComparison
        .sort((a, b) => b.metrics.roi - a.metrics.roi)
        .slice(0, 5)
        .map(c => ({
          name: c.campaignName,
          type: c.campaignType,
          roi: c.metrics.roi,
          winRate: c.metrics.winRate,
          targetAccountCustomers: c.metrics.targetAccountCustomers
        }))
    };
    
    console.log('🎯 API: Dashboard summary completed successfully');
    res.json(summary);
    
  } catch (error) {
    console.error('❌ API Error in /dashboard-summary:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard summary',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;