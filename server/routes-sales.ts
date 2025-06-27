import { Express } from 'express';
import { isAuthenticated } from './localAuthBypass';
import { storage } from './storage';

export function registerSalesRoutes(app: Express) {
  // Get sales representatives list
  app.get('/api/sales/reps', isAuthenticated, async (req, res) => {
    try {
      const salesReps = await storage.salesStorage.getSalesRepsList();
      res.json(salesReps);
    } catch (error) {
      console.error('Error fetching sales reps:', error);
      res.status(500).json({ error: 'Failed to fetch sales representatives' });
    }
  });

  // Get available stages for sales filtering
  app.get('/api/sales/stages', isAuthenticated, async (req, res) => {
    try {
      const stages = await storage.getStageDistribution();
      res.json(stages);
    } catch (error) {
      console.error('Error fetching stages:', error);
      res.status(500).json({ error: 'Failed to fetch stages' });
    }
  });

  // Get available clients for sales filtering
  app.get('/api/sales/clients', isAuthenticated, async (req, res) => {
    try {
      const clients = await storage.getClientsList();
      res.json(clients);
    } catch (error) {
      console.error('Error fetching clients:', error);
      res.status(500).json({ error: 'Failed to fetch clients' });
    }
  });

  // Get sales analytics with sales rep filtering
  app.get('/api/sales/analytics', isAuthenticated, async (req, res) => {
    try {
      const { salesRep, startDate, endDate, stages, minValue, maxValue, search, valueType, clientName } = req.query;
      
      // Build filter object
      const filters = {
        salesRep: salesRep as string,
        startDate: startDate as string,
        endDate: endDate as string,
        stages: stages ? (stages as string).split(',') : [],
        minValue: minValue as string,
        maxValue: maxValue as string,
        search: search as string,
        valueType: valueType as string,
        clientName: clientName as string
      };

      console.log('📊 Sales Analytics Request:', filters);

      // Get analytics data with sales rep filtering
      const [
        pipelineValueByDate,
        stageDistribution,
        fiscalYearPipeline,
        fiscalQuarterPipeline,
        monthlyPipeline,
        stageTimingData,
        dateSlippageData,
        duplicateOpportunities,
        valueChanges,
        closingProbabilityData,
        stageFunnel,
        winRateAnalysis,
        closeRateAnalysis,
        lossReasons
      ] = await Promise.all([
        storage.getSalesPipelineValueByDate(filters),
        storage.getSalesStageDistribution(filters),
        storage.getSalesFiscalYearPipeline(filters),
        storage.getSalesFiscalQuarterPipeline(filters),
        storage.getSalesMonthlyPipeline(filters),
        storage.getSalesStageTimingData(filters),
        storage.getSalesDateSlippageData(filters),
        storage.getSalesDuplicateOpportunities(filters),
        storage.getSalesValueChanges(filters),
        storage.getSalesClosingProbabilityData(filters),
        storage.getSalesStageFunnel(filters),
        storage.getSalesWinRateForFiscalYear(2025, filters),
        storage.getSalesCloseRateForPeriod(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date(), filters),
        storage.getSalesLossReasons(filters)
      ]);

      // Calculate metrics using the same logic as original pipeline analytics
      // Total Pipeline Value: Sum of Year1 ARR from stage distribution (current snapshot)
      const totalValue = stageDistribution.reduce((sum, stage) => sum + stage.value, 0);
      
      // Active Opportunities: Count from stage distribution (excludes Validation/Introduction and Closed)
      const activeCount = stageDistribution.reduce((sum, stage) => sum + stage.count, 0);
      
      // Total Contract Value: Sum of TCV from current snapshots
      const totalContractValue = await storage.getSalesTotalContractValue(filters);
      
      // Average Deal Size: Total Pipeline Value / Active Opportunities
      const avgDealSize = activeCount > 0 ? totalValue / activeCount : 0;
      
      // Conversion Rate: calculate from stage funnel if available
      const conversionRate = stageFunnel && stageFunnel.length > 1 ? 
        stageFunnel[stageFunnel.length - 1].count / stageFunnel[0].count : 0;

      const metrics = {
        totalValue,
        activeCount,
        avgDealSize,
        conversionRate,
        winRate: winRateAnalysis?.winRate || 0,
        closeRate: closeRateAnalysis?.closeRate || 0,
        totalContractValue,
        // Add change calculations here if needed
        valueChange: 0,
        countChange: 0,
        avgDealChange: 0,
        conversionChange: 0
      };

      res.json({
        metrics,
        pipelineValueByDate,
        stageDistribution,
        fiscalYearPipeline,
        fiscalQuarterPipeline,
        monthlyPipeline,
        stageTimingData,
        dateSlippageData,
        duplicateOpportunities,
        valueChanges,
        closingProbabilityData,
        stageFunnel,
        winRateAnalysis,
        closeRateAnalysis,
        lossReasons
      });
    } catch (error) {
      console.error('Error fetching sales analytics:', error);
      res.status(500).json({ error: 'Failed to fetch sales analytics' });
    }
  });

  // Get sales opportunities with filtering
  app.get('/api/sales/opportunities', isAuthenticated, async (req, res) => {
    try {
      const { salesRep, startDate, endDate, stages, minValue, maxValue, search, valueType, clientName } = req.query;
      
      const filters = {
        salesRep: salesRep as string,
        startDate: startDate as string,
        endDate: endDate as string,
        stages: stages ? (stages as string).split(',') : [],
        minValue: minValue as string,
        maxValue: maxValue as string,
        search: search as string,
        valueType: valueType as string,
        clientName: clientName as string
      };

      const opportunities = await storage.getSalesOpportunities(filters);
      res.json(opportunities);
    } catch (error) {
      console.error('Error fetching sales opportunities:', error);
      res.status(500).json({ error: 'Failed to fetch sales opportunities' });
    }
  });

  // Get sales stage flow analysis
  app.get('/api/sales/stage-flow', isAuthenticated, async (req, res) => {
    try {
      const { salesRep, timeframe } = req.query;
      
      const filters = {
        salesRep: salesRep as string,
        timeframe: timeframe as string || '90'
      };

      const stageFlow = await storage.getSalesStageFlow(filters);
      res.json(stageFlow);
    } catch (error) {
      console.error('Error fetching sales stage flow:', error);
      res.status(500).json({ error: 'Failed to fetch sales stage flow' });
    }
  });

  // Get sales loss analysis
  app.get('/api/sales/loss-analysis', isAuthenticated, async (req, res) => {
    try {
      const { salesRep, startDate, endDate } = req.query;
      
      const filters = {
        salesRep: salesRep as string,
        startDate: startDate as string,
        endDate: endDate as string
      };

      const lossAnalysis = await storage.getSalesLossAnalysis(filters);
      res.json(lossAnalysis);
    } catch (error) {
      console.error('Error fetching sales loss analysis:', error);
      res.status(500).json({ error: 'Failed to fetch sales loss analysis' });
    }
  });

  // Get recent losses for sales rep
  app.get('/api/sales/recent-losses', isAuthenticated, async (req, res) => {
    try {
      const { salesRep } = req.query;
      
      const filters = {
        salesRep: salesRep as string,
        days: 30 // Last 30 days
      };

      const recentLosses = await storage.getSalesRecentLosses(filters);
      res.json({ recentLosses });
    } catch (error) {
      console.error('Error fetching recent losses:', error);
      res.status(500).json({ error: 'Failed to fetch recent losses' });
    }
  });

  console.log('✅ Sales routes registered successfully');
}