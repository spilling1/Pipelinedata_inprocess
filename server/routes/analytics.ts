import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../localAuthBypass";
import { requirePermission } from "../middleware/permissions";

export const analyticsRouter = Router();

// Win rate endpoint
analyticsRouter.get("/api/analytics/win-rate", isAuthenticated, requirePermission('sales'), async (req, res) => {
  try {
    // Get sales rep filter from query params
    const { salesRep } = req.query;
    
    // Get all opportunities and snapshots for pipeline analysis
    const opportunities = await storage.opportunitiesStorage.getAllOpportunities();
    const snapshots = await storage.snapshotsStorage.getAllSnapshots();

    // Group snapshots by opportunity for easier processing
    const snapshotsByOpp = snapshots.reduce((acc, snapshot) => {
      if (!acc[snapshot.opportunityId]) {
        acc[snapshot.opportunityId] = [];
      }
      acc[snapshot.opportunityId].push(snapshot);
      return acc;
    }, {} as Record<number, typeof snapshots>);

    // Find the latest snapshot for each opportunity
    const latestSnapshots = opportunities.map(opp => {
      const oppSnapshots = snapshotsByOpp[opp.id] || [];
      const latest = oppSnapshots.reduce((latest, snapshot) => {
        return !latest || new Date(snapshot.snapshotDate) > new Date(latest.snapshotDate) 
          ? snapshot 
          : latest;
      }, null as typeof snapshots[0] | null);
      
      return {
        opportunity: opp,
        latestSnapshot: latest
      };
    }).filter(item => item.latestSnapshot);

    // Apply sales rep filter if provided
    let filteredData = latestSnapshots;
    if (salesRep && salesRep !== 'all') {
      filteredData = latestSnapshots.filter(item => 
        item.latestSnapshot && item.latestSnapshot.owner === salesRep
      );
    }

    // Calculate win rate for current fiscal year
    const now = new Date();
    const currentFiscalYearStart = new Date(now.getFullYear(), 0, 1); // January 1st
    if (now.getMonth() < 6) { // If before July, use previous year
      currentFiscalYearStart.setFullYear(now.getFullYear() - 1);
    }

    const fiscalYearData = filteredData.filter(item => {
      if (!item.latestSnapshot) return false;
      const snapshotDate = new Date(item.latestSnapshot.snapshotDate);
      return snapshotDate >= currentFiscalYearStart;
    });

    const closedWon = fiscalYearData.filter(item => 
      item.latestSnapshot && item.latestSnapshot.stage === 'Closed Won'
    ).length;
    
    const closedLost = fiscalYearData.filter(item => 
      item.latestSnapshot && item.latestSnapshot.stage === 'Closed Lost'
    ).length;

    const totalClosed = closedWon + closedLost;
    const winRate = totalClosed > 0 ? (closedWon / totalClosed) * 100 : 0;

    res.json({
      winRate: Math.round(winRate * 10) / 10, // Round to 1 decimal place
      closedWon,
      closedLost,
      totalClosed,
      fiscalYearStart: currentFiscalYearStart
    });
  } catch (error) {
    console.error('Error calculating win rate:', error);
    res.status(500).json({ error: 'Failed to calculate win rate' });
  }
});

// Pipeline metrics endpoint
analyticsRouter.get("/api/analytics/pipeline-metrics", isAuthenticated, requirePermission('sales'), async (req, res) => {
  try {
    // Get sales rep filter from query params
    const { salesRep } = req.query;
    
    // Get all opportunities and snapshots for pipeline analysis
    const opportunities = await storage.opportunitiesStorage.getAllOpportunities();
    const snapshots = await storage.snapshotsStorage.getAllSnapshots();

    // Group snapshots by opportunity for easier processing
    const snapshotsByOpp = snapshots.reduce((acc, snapshot) => {
      if (!acc[snapshot.opportunityId]) {
        acc[snapshot.opportunityId] = [];
      }
      acc[snapshot.opportunityId].push(snapshot);
      return acc;
    }, {} as Record<number, typeof snapshots>);

    // Find the latest snapshot for each opportunity
    const latestSnapshots = opportunities.map(opp => {
      const oppSnapshots = snapshotsByOpp[opp.id] || [];
      const latest = oppSnapshots.reduce((latest, snapshot) => {
        return !latest || new Date(snapshot.snapshotDate) > new Date(latest.snapshotDate) 
          ? snapshot 
          : latest;
      }, null as typeof snapshots[0] | null);
      
      return {
        opportunity: opp,
        latestSnapshot: latest
      };
    }).filter(item => item.latestSnapshot);

    // Apply sales rep filter if provided
    let filteredData = latestSnapshots;
    if (salesRep && salesRep !== 'all') {
      filteredData = latestSnapshots.filter(item => 
        item.latestSnapshot && item.latestSnapshot.owner === salesRep
      );
    }

    // Calculate pipeline metrics (excluding Validation/Introduction stage and closed deals)
    const openPipeline = filteredData.filter(item => {
      if (!item.latestSnapshot) return false;
      const stage = item.latestSnapshot.stage;
      return stage !== 'Validation' && 
             stage !== 'Introduction' && 
             stage !== 'Closed Won' && 
             stage !== 'Closed Lost';
    });

    const totalYear1Arr = openPipeline.reduce((sum, item) => {
      return sum + (item.latestSnapshot?.year1Value || 0);
    }, 0);

    const totalContractValue = openPipeline.reduce((sum, item) => {
      return sum + (item.latestSnapshot?.tcv || 0);
    }, 0);

    const activeCount = openPipeline.length;
    const avgDealSize = activeCount > 0 ? totalYear1Arr / activeCount : 0;

    res.json({
      totalYear1Arr,
      totalContractValue,
      activeCount,
      avgDealSize,
      avgDealSizePipeline: avgDealSize // Alias for compatibility
    });
  } catch (error) {
    console.error('Error calculating pipeline metrics:', error);
    res.status(500).json({ error: 'Failed to calculate pipeline metrics' });
  }
});

// Pipeline value endpoint
analyticsRouter.get("/api/analytics/pipeline-value", isAuthenticated, requirePermission('sales'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const data = await storage.analyticsStorage.getPipelineValueByDate(
      startDate as string, 
      endDate as string
    );
    res.json(data);
  } catch (error) {
    console.error('Error fetching pipeline value:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline value data' });
  }
});

// Stage distribution endpoint
analyticsRouter.get("/api/analytics/stage-distribution", isAuthenticated, requirePermission('sales'), async (req, res) => {
  try {
    const data = await storage.analyticsStorage.getStageDistribution();
    res.json(data);
  } catch (error) {
    console.error('Error fetching stage distribution:', error);
    res.status(500).json({ error: 'Failed to fetch stage distribution data' });
  }
});

// Fiscal pipeline endpoint
analyticsRouter.get("/api/analytics/fiscal-pipeline", isAuthenticated, requirePermission('sales'), async (req, res) => {
  try {
    const fiscalYearData = await storage.analyticsStorage.getFiscalYearPipeline();
    const fiscalQuarterData = await storage.analyticsStorage.getFiscalQuarterPipeline();
    const monthlyData = await storage.analyticsStorage.getMonthlyPipeline();

    res.json({
      fiscalYearPipeline: fiscalYearData,
      fiscalQuarterPipeline: fiscalQuarterData,
      monthlyPipeline: monthlyData
    });
  } catch (error) {
    console.error('Error fetching fiscal pipeline data:', error);
    res.status(500).json({ error: 'Failed to fetch fiscal pipeline data' });
  }
});

// Close rate endpoint
analyticsRouter.get("/api/analytics/close-rate", isAuthenticated, requirePermission('sales'), async (req, res) => {
  try {
    // Get sales rep filter from query params
    const { salesRep } = req.query;
    
    // Get all opportunities and snapshots for pipeline analysis
    const opportunities = await storage.opportunitiesStorage.getAllOpportunities();
    const snapshots = await storage.snapshotsStorage.getAllSnapshots();

    // Group snapshots by opportunity for easier processing
    const snapshotsByOpp = snapshots.reduce((acc, snapshot) => {
      if (!acc[snapshot.opportunityId]) {
        acc[snapshot.opportunityId] = [];
      }
      acc[snapshot.opportunityId].push(snapshot);
      return acc;
    }, {} as Record<number, typeof snapshots>);

    // Find the latest snapshot for each opportunity
    const latestSnapshots = opportunities.map(opp => {
      const oppSnapshots = snapshotsByOpp[opp.id] || [];
      const latest = oppSnapshots.reduce((latest, snapshot) => {
        return !latest || new Date(snapshot.snapshotDate) > new Date(latest.snapshotDate) 
          ? snapshot 
          : latest;
      }, null as typeof snapshots[0] | null);
      
      return {
        opportunity: opp,
        latestSnapshot: latest
      };
    }).filter(item => item.latestSnapshot);

    // Apply sales rep filter if provided
    let filteredData = latestSnapshots;
    if (salesRep && salesRep !== 'all') {
      filteredData = latestSnapshots.filter(item => 
        item.latestSnapshot && item.latestSnapshot.owner === salesRep
      );
    }

    // Calculate close rate for last 12 months using rolling methodology
    const now = new Date();
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(now.getMonth() - 12);

    // Filter for opportunities that entered pipeline in the last 12 months
    const rollingData = filteredData.filter(item => {
      if (!item.latestSnapshot) return false;
      
      // Use entered_pipeline date if available, otherwise fall back to created date
      const entryDate = item.latestSnapshot.enteredPipeline ? 
        new Date(item.latestSnapshot.enteredPipeline) : 
        (item.opportunity.createdDate ? new Date(item.opportunity.createdDate) : null);
      
      if (!entryDate) return false;
      
      // Include deals that entered pipeline in the last 12 months
      const isInTimeRange = entryDate >= twelveMonthsAgo && entryDate <= now;
      
      // Exclude Validation/Introduction stage
      const stage = item.latestSnapshot.stage;
      const isValidStage = stage !== 'Validation' && stage !== 'Introduction';
      
      return isInTimeRange && isValidStage;
    });

    const closedWon = rollingData.filter(item => 
      item.latestSnapshot && item.latestSnapshot.stage === 'Closed Won'
    ).length;
    
    const totalOpportunities = rollingData.length;
    const closeRate = totalOpportunities > 0 ? (closedWon / totalOpportunities) * 100 : 0;

    res.json({
      closeRate: Math.round(closeRate * 10) / 10, // Round to 1 decimal place
      closedWon,
      totalOpportunities,
      timeRange: {
        start: twelveMonthsAgo,
        end: now
      }
    });
  } catch (error) {
    console.error('Error calculating close rate:', error);
    res.status(500).json({ error: 'Failed to calculate close rate' });
  }
});

export default analyticsRouter;