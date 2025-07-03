import { Router } from 'express';
import { marketingComparativeStorage } from './storage-mktg-comparative.js';
import { db } from './db.js';
import { campaigns, campaignCustomers, snapshots, opportunities } from '../shared/schema.js';
import { eq, and, sql, desc, inArray, gte } from 'drizzle-orm';

const router = Router();

// Simple cache for expensive queries (5 minutes)
let executiveSummaryCache: { data: any; timestamp: number } | null = null;
let campaignTypesCache: { data: any; timestamp: number; key?: string } | null = null;
let newPipelineCache: { data: any; timestamp: number } | null = null;
let stageAdvanceCache: { data: any; timestamp: number } | null = null;
let customerJourneyCache: { data: any; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function to filter campaigns by time period using fiscal year logic
function filterCampaignsByTimePeriod(campaigns: any[], timePeriod: string) {
  if (timePeriod === 'all-time') {
    return campaigns;
  }

  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;

  // Fiscal year runs Feb 1 - Jan 31
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11

  // Determine current fiscal year
  const currentFiscalYear = currentMonth >= 2 ? currentYear : currentYear - 1;

  switch (timePeriod) {
    case 'fy-to-date':
      startDate = new Date(currentFiscalYear, 1, 1); // Feb 1 of current fiscal year
      break;
    case 'last-year':
      startDate = new Date(currentFiscalYear - 1, 1, 1); // Feb 1 of last fiscal year
      endDate = new Date(currentFiscalYear, 0, 31); // Jan 31 of current fiscal year
      break;
    case 'quarter-to-date':
      // Fiscal quarters: Q1: Feb-Apr, Q2: May-Jul, Q3: Aug-Oct, Q4: Nov-Jan
      if (currentMonth >= 2 && currentMonth <= 4) { // Q1
        startDate = new Date(currentFiscalYear, 1, 1); // Feb 1
      } else if (currentMonth >= 5 && currentMonth <= 7) { // Q2
        startDate = new Date(currentFiscalYear, 4, 1); // May 1
      } else if (currentMonth >= 8 && currentMonth <= 10) { // Q3
        startDate = new Date(currentFiscalYear, 7, 1); // Aug 1
      } else { // Q4 (Nov, Dec, Jan)
        startDate = new Date(currentFiscalYear, 10, 1); // Nov 1
      }
      break;
    case 'last-quarter':
      if (currentMonth >= 2 && currentMonth <= 4) { // Q1, so last quarter is Q4
        startDate = new Date(currentFiscalYear - 1, 10, 1); // Nov 1 of previous year
        endDate = new Date(currentFiscalYear, 0, 31); // Jan 31 of current year
      } else if (currentMonth >= 5 && currentMonth <= 7) { // Q2, so last quarter is Q1
        startDate = new Date(currentFiscalYear, 1, 1); // Feb 1
        endDate = new Date(currentFiscalYear, 3, 30); // Apr 30
      } else if (currentMonth >= 8 && currentMonth <= 10) { // Q3, so last quarter is Q2
        startDate = new Date(currentFiscalYear, 4, 1); // May 1
        endDate = new Date(currentFiscalYear, 6, 31); // Jul 31
      } else { // Q4, so last quarter is Q3
        startDate = new Date(currentFiscalYear, 7, 1); // Aug 1
        endDate = new Date(currentFiscalYear, 9, 31); // Oct 31
      }
      break;
    default:
      return campaigns;
  }

  return campaigns.filter(campaign => {
    const campaignDate = new Date(campaign.startDate);
    return campaignDate >= startDate && campaignDate <= endDate;
  });
}

/**
 * Executive Summary - Comprehensive marketing performance overview
 * Provides high-level metrics, trends, and strategic insights
 */
router.get('/executive-summary', async (req, res) => {
  try {
    // Check cache first
    const now = Date.now();
    if (executiveSummaryCache && (now - executiveSummaryCache.timestamp) < CACHE_DURATION) {
      console.log('📊 API: Returning cached executive summary');
      return res.json(executiveSummaryCache.data);
    }

    console.log('📊 API: Fetching executive summary data...');
    
    const summary = await marketingComparativeStorage.getExecutiveSummaryFast();
    
    // Cache the result
    executiveSummaryCache = { data: summary, timestamp: now };
    console.log('📊 API: Executive summary completed and cached');
    
    res.json(summary);
    
  } catch (error) {
    console.error('❌ API Error in /executive-summary:', error);
    res.status(500).json({ 
      error: 'Failed to fetch executive summary data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

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
      filteredData = filteredData.filter(campaign => {
        // Most campaigns don't have endDate, so we filter by start date instead
        return campaign.startDate <= filterEndDate;
      });
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
    const timePeriod = req.query.timePeriod as string || 'fy-to-date';
    
    // Check cache first (include timePeriod in cache key)
    const cacheKey = `campaign-types-${timePeriod}`;
    const now = Date.now();
    if (campaignTypesCache && campaignTypesCache.key === cacheKey && (now - campaignTypesCache.timestamp) < CACHE_DURATION) {
      console.log(`📈 API: Returning cached campaign types for ${timePeriod}`);
      return res.json(campaignTypesCache.data);
    }

    console.log(`📈 API: Fetching campaign type analytics for ${timePeriod}...`);
    
    // Get campaign comparison data and aggregate by type
    let campaignData = await marketingComparativeStorage.getCampaignComparisonData();
    
    // Apply time filtering based on fiscal year periods (Feb 1 - Jan 31)
    campaignData = filterCampaignsByTimePeriod(campaignData, timePeriod);
    
    // Group campaigns by type
    const typeGroups = campaignData.reduce((groups, campaign) => {
      const type = campaign.campaignType;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(campaign);
      return groups;
    }, {} as Record<string, typeof campaignData>);
    
    // Calculate aggregated metrics for each type using corrected pipeline logic
    const typeAnalytics = await Promise.all(Object.entries(typeGroups).map(async ([type, campaigns]) => {
      const totalCampaigns = campaigns.length;
      const totalCost = campaigns.reduce((sum, c) => sum + c.cost, 0);
      const campaignIds = campaigns.map(c => c.campaignId);
      
      // Use corrected pipeline calculation that avoids double-counting opportunities
      const { pipelineValue: totalPipelineValue, closedWonValue: totalClosedWonValue, uniqueOpportunities } = 
        await marketingComparativeStorage.calculateCampaignTypePipeline(campaignIds);
      
      // Use the same logic as Total Pipeline calculation for customer counts
      const totalCustomers = uniqueOpportunities; // Same 3-step filtering as pipeline
      const totalOpenOpportunities = uniqueOpportunities;
      
      // Calculate target customers from the qualifying opportunities using same logic
      const qualifyingOpportunityIds = await marketingComparativeStorage.getQualifyingOpportunityIds(campaignIds);
      const targetCustomerCount = await marketingComparativeStorage.countTargetAccountsInOpportunities(qualifyingOpportunityIds);
      const totalTargetCustomers = targetCustomerCount;
      
      console.log(`📊 Campaign Type: ${type}`);
      console.log(`   ✅ Qualifying Opportunities (Customer Count): ${totalCustomers}`);
      console.log(`   🎯 Target Account Customers: ${totalTargetCustomers}`);
      
      // Calculate total attendees (no deduplication needed since it's per campaign)
      const totalAttendees = campaigns.reduce((sum, c) => sum + c.metrics.totalAttendees, 0);
      
      // Calculate win rate using weighted average approach
      const validCampaigns = campaigns.filter(c => c.metrics.totalCustomers > 0);
      let aggregateWinRate = 0;
      if (validCampaigns.length > 0) {
        let totalWeight = 0;
        let weightedWinRate = 0;
        
        validCampaigns.forEach(campaign => {
          const weight = campaign.metrics.totalCustomers;
          totalWeight += weight;
          weightedWinRate += (campaign.metrics.winRate * weight);
        });
        
        aggregateWinRate = totalWeight > 0 ? weightedWinRate / totalWeight : 0;
      }
      
      // Calculate ROI as Closed Won Value / Total Cost (not average of individual ROIs)
      const aggregateROI = totalCost > 0 ? (totalClosedWonValue / totalCost) * 100 : 0;
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
        totalOpenOpportunities,
        totalAttendees,
        averageWinRate: aggregateWinRate,
        averageROI: aggregateROI,
        averageTargetAccountWinRate: avgTargetAccountWinRate,
        costEfficiency,
        attendeeEfficiency,
        averageCostPerCampaign: totalCampaigns > 0 ? totalCost / totalCampaigns : 0,
        averageCustomersPerCampaign: totalCampaigns > 0 ? totalCustomers / totalCampaigns : 0,
        averageAttendeesPerCampaign: totalCampaigns > 0 ? totalAttendees / totalCampaigns : 0
      };
    }));
    
    // Sort by total pipeline value descending
    typeAnalytics.sort((a, b) => b.totalPipelineValue - a.totalPipelineValue);
    
    // Calculate ACTUAL unique customers and pipeline value across all campaign types (avoid double-counting)
    const allCampaignIds = campaignData.map(c => c.campaignId);
    const { uniqueOpportunities: actualUniqueCustomers, pipelineValue: actualTotalPipeline, closedWonValue: actualTotalClosedWon, openPipelineValue: actualOpenPipeline, openPipelineCustomers: actualOpenCustomers, closedWonCustomers: actualClosedWonCustomers } = 
      await marketingComparativeStorage.calculateCampaignTypePipeline(allCampaignIds);
    
    // Log both the incorrect sum and the correct unique count for comparison
    const summedCount = typeAnalytics.reduce((sum, type) => sum + type.totalCustomers, 0);
    const summedPipeline = typeAnalytics.reduce((sum, type) => sum + type.totalPipelineValue, 0);
    console.log(`📊 TOTAL CUSTOMERS CALCULATION:`);
    console.log(`   ❌ Incorrect sum across campaign types: ${summedCount} (double-counts opportunities)`);
    console.log(`   ✅ Actual unique customers across all campaigns: ${actualUniqueCustomers}`);
    console.log(`   📝 Using ${actualUniqueCustomers} as the correct "customers engaged" figure`);
    console.log(`📊 TOTAL PIPELINE CALCULATION:`);
    console.log(`   ❌ Incorrect sum across campaign types: $${summedPipeline.toLocaleString()} (double-counts opportunities)`);
    console.log(`   ✅ Actual total pipeline across all campaigns: $${actualTotalPipeline.toLocaleString()}`);
    console.log(`   📝 Using $${actualTotalPipeline.toLocaleString()} as the correct "Total Pipeline" figure`);
    
    // Cache the result with corrected metadata
    const responseData = {
      campaignTypes: typeAnalytics,
      metadata: {
        totalUniqueCustomers: actualUniqueCustomers,
        totalPipelineValue: actualTotalPipeline,
        totalClosedWonValue: actualTotalClosedWon,
        openPipelineValue: actualOpenPipeline,
        openPipelineCustomers: actualOpenCustomers,
        closedWonCustomers: actualClosedWonCustomers,
        timePeriod: timePeriod,
        calculatedAt: new Date().toISOString()
      }
    };
    
    campaignTypesCache = { data: responseData, timestamp: Date.now(), key: cacheKey };
    console.log(`📈 API: Campaign type analytics completed and cached for ${timePeriod} - ${typeAnalytics.length} types`);
    
    res.json(responseData);
    
  } catch (error) {
    console.error('❌ API Error in /campaign-types:', error);
    res.status(500).json({ 
      error: 'Failed to fetch campaign type analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * New Pipeline Analysis (30d) - Campaign types ranked by new pipeline creation
 * Shows opportunities that entered pipeline within 30 days of campaign events
 */
router.get('/campaign-types-new-pipeline', async (req, res) => {
  try {
    // Check cache first
    const now = Date.now();
    if (newPipelineCache && (now - newPipelineCache.timestamp) < CACHE_DURATION) {
      console.log('📈 API: Returning cached new pipeline data');
      return res.json(newPipelineCache.data);
    }

    console.log('📈 API: Fetching new pipeline (30d) campaign type analytics...');
    
    const campaignTypes = await marketingComparativeStorage.getCampaignTypeNewPipelineAnalysis();
    
    // Cache the result
    newPipelineCache = { data: campaignTypes, timestamp: Date.now() };
    console.log(`📈 API: New pipeline analytics completed and cached - ${campaignTypes.length} types`);
    
    res.json(campaignTypes);
    
  } catch (error) {
    console.error('❌ API Error in /campaign-types-new-pipeline:', error);
    res.status(500).json({ 
      error: 'Failed to fetch new pipeline campaign type analytics', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * Stage Advance Analysis (30d) - Campaign types ranked by stage progression
 * Shows pipeline that moved positively through stages within 30 days of campaign events
 */
router.get('/campaign-types-stage-advance', async (req, res) => {
  try {
    // Check cache first
    const now = Date.now();
    if (stageAdvanceCache && (now - stageAdvanceCache.timestamp) < CACHE_DURATION) {
      console.log('📈 API: Returning cached stage advance data');
      return res.json(stageAdvanceCache.data);
    }

    console.log('📈 API: Fetching stage advance (30d) campaign type analytics...');
    
    const campaignTypes = await marketingComparativeStorage.getCampaignTypeStageAdvanceAnalysis();
    
    // Cache the result
    stageAdvanceCache = { data: campaignTypes, timestamp: Date.now() };
    console.log(`📈 API: Stage advance analytics completed and cached - ${campaignTypes.length} types`);
    
    res.json(campaignTypes);
    
  } catch (error) {
    console.error('❌ API Error in /campaign-types-stage-advance:', error);
    res.status(500).json({ 
      error: 'Failed to fetch stage advance campaign type analytics', 
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

/**
 * Get customer journey analysis with multi-touch attribution
 * Shows touches per customer and cumulative CAC
 */
router.get('/customer-journey', async (req, res) => {
  try {
    // Check cache first
    const now = Date.now();
    if (customerJourneyCache && (now - customerJourneyCache.timestamp) < CACHE_DURATION) {
      console.log('📈 API: Returning cached customer journey data');
      return res.json(customerJourneyCache.data);
    }

    console.log('🎯🛤️ API: Fetching customer journey analysis...');
    
    const customerJourneyData = await marketingComparativeStorage.getCustomerJourneyAnalysis();
    
    // Cache the result
    customerJourneyCache = { data: customerJourneyData, timestamp: Date.now() };
    console.log(`🎯🛤️ Customer journey analysis completed and cached - ${customerJourneyData.customers?.length || 0} customers analyzed`);
    
    res.json(customerJourneyData);
    
  } catch (error) {
    console.error('❌ API Error in /customer-journey:', error);
    res.status(500).json({ 
      error: 'Failed to fetch customer journey analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get detailed list of all qualifying opportunities
 * Returns the 72 opportunities that meet the 3-step pipeline criteria
 */
router.get('/qualifying-opportunities', async (req, res) => {
  try {
    console.log('📋 API: Fetching detailed qualifying opportunities list...');
    
    const opportunities = await marketingComparativeStorage.getDetailedQualifyingOpportunities();
    
    console.log(`📋 API: Returning ${opportunities.length} qualifying opportunities`);
    res.json(opportunities);
    
  } catch (error) {
    console.error('❌ API Error in /qualifying-opportunities:', error);
    res.status(500).json({ 
      error: 'Failed to fetch qualifying opportunities',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Export qualifying opportunities as CSV
 * Downloads the 72 opportunities that meet the 3-step pipeline criteria
 */
router.get('/qualifying-opportunities/csv', async (req, res) => {
  try {
    console.log('📋 API: Exporting qualifying opportunities as CSV...');
    
    const opportunities = await marketingComparativeStorage.getDetailedQualifyingOpportunities();
    
    // Create CSV headers
    const headers = [
      'Opportunity ID',
      'Name', 
      'Client Name',
      'Stage',
      'Year 1 Value',
      'Entered Pipeline',
      'Close Date',
      'Snapshot Date',
      'Campaign Type',
      'First Campaign Date'
    ];

    // Create CSV rows
    const csvRows = [
      headers.join(','),
      ...opportunities.map(opp => [
        `"${opp.opportunityIdString}"`,
        `"${opp.name.replace(/"/g, '""')}"`,
        `"${opp.clientName || ''}"`,
        `"${opp.stage}"`,
        opp.year1Value,
        opp.enteredPipeline ? opp.enteredPipeline.toISOString().split('T')[0] : '',
        opp.closeDate ? opp.closeDate.toISOString().split('T')[0] : '',
        opp.snapshotDate.toISOString().split('T')[0],
        `"${opp.campaignType}"`,
        new Date(opp.firstCampaignDate).toISOString().split('T')[0]
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="qualifying-opportunities.csv"');
    
    console.log(`📋 API: Exporting ${opportunities.length} qualifying opportunities as CSV`);
    res.send(csvContent);
    
  } catch (error) {
    console.error('❌ API Error in /qualifying-opportunities/csv:', error);
    res.status(500).json({ 
      error: 'Failed to export qualifying opportunities',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;