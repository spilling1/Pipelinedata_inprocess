import { Express } from 'express';
import { marketingGraphStorage } from './storage-mktg-graph.js';
import { marketingStorage } from './storage-mktg.js';
import { isAuthenticated } from './localAuthBypass.js';

export function registerMarketingGraphRoutes(app: Express) {
  console.log('🔗 Registering marketing graph routes');

  // Pipeline Walk Chart Data
  app.get('/api/marketing/campaigns/:id/pipeline-walk', isAuthenticated, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      
      if (isNaN(campaignId)) {
        return res.status(400).json({ error: 'Invalid campaign ID' });
      }

      console.log('📊 Getting pipeline walk data for campaign:', campaignId);
      const pipelineWalkData = await marketingGraphStorage.getCampaignPipelineWalk(campaignId);
      
      res.json(pipelineWalkData);
    } catch (error) {
      console.error('❌ Error getting pipeline walk data:', error);
      res.status(500).json({ 
        error: 'Failed to get pipeline walk data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Stage Flow Sankey Chart Data
  app.get('/api/marketing/campaigns/:id/stage-flow', isAuthenticated, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      
      if (isNaN(campaignId)) {
        return res.status(400).json({ error: 'Invalid campaign ID' });
      }

      console.log('📊 Getting stage flow data for campaign:', campaignId);
      const stageFlowData = await marketingGraphStorage.getCampaignStageFlow(campaignId);
      
      res.json(stageFlowData);
    } catch (error) {
      console.error('❌ Error getting stage flow data:', error);
      res.status(500).json({ 
        error: 'Failed to get stage flow data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Pipeline by Owner Data
  app.get('/api/marketing/campaigns/:id/pipeline-by-owner', isAuthenticated, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      
      if (isNaN(campaignId)) {
        return res.status(400).json({ error: 'Invalid campaign ID' });
      }

      console.log('📊 Getting pipeline by owner data for campaign:', campaignId);
      const pipelineByOwnerData = await marketingStorage.getCampaignPipelineByOwner(campaignId);
      
      res.json(pipelineByOwnerData);
    } catch (error) {
      console.error('❌ Error getting pipeline by owner data:', error);
      res.status(500).json({ 
        error: 'Failed to get pipeline by owner data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Stage Movements Data
  app.get('/api/marketing/campaigns/:id/stage-movements', isAuthenticated, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      
      if (isNaN(campaignId)) {
        return res.status(400).json({ error: 'Invalid campaign ID' });
      }

      const daysFromStart = req.query.days ? parseInt(req.query.days as string) : undefined;
      
      console.log('📊 Getting stage movements for campaign:', campaignId, 'days from start:', daysFromStart || 'all time');
      const stageMovements = await marketingStorage.getCampaignStageMovements(campaignId, daysFromStart);
      
      res.json(stageMovements);
    } catch (error) {
      console.error('❌ Error getting stage movements:', error);
      res.status(500).json({ 
        error: 'Failed to get stage movements',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });



  console.log('✅ Marketing graph routes registered successfully');
}