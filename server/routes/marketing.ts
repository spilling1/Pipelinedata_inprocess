import { Router } from 'express';
import { marketingStorage } from '../storage-mktg.js';
import { isAuthenticated } from '../localAuthBypass.js';
import { insertCampaignSchema, insertCampaignCustomerSchema, snapshots } from '../../shared/schema.js';
import { z } from 'zod';
import { and, eq, gte, lte, asc, desc } from 'drizzle-orm';

const router = Router();

// Campaign CRUD operations
router.get('/campaigns', isAuthenticated, async (req, res) => {
  try {
    const campaigns = await marketingStorage.getAllCampaigns();
    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

router.get('/campaigns/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const campaign = await marketingStorage.getCampaign(id);
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    res.json(campaign);
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

router.post('/campaigns', isAuthenticated, async (req, res) => {
  try {
    console.log('📝 Campaign creation request body:', req.body);
    
    // Transform startDate string to Date object for validation
    const transformedData = {
      ...req.body,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
    };
    
    console.log('🔄 Transformed data:', transformedData);
    
    const validatedData = insertCampaignSchema.parse(transformedData);
    console.log('✅ Validated data:', validatedData);
    
    const campaign = await marketingStorage.createCampaign(validatedData);
    res.status(201).json(campaign);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Validation errors:', error.errors);
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

router.put('/campaigns/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    console.log('📝 Campaign update request body:', req.body);
    
    // Transform startDate string to Date object for validation (same as POST)
    const transformedData = {
      ...req.body,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
    };
    
    console.log('🔄 Transformed update data:', transformedData);
    
    const validatedData = insertCampaignSchema.partial().parse(transformedData);
    console.log('✅ Validated update data:', validatedData);
    
    const campaign = await marketingStorage.updateCampaign(id, validatedData);
    res.json(campaign);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Validation errors:', error.errors);
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating campaign:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

router.delete('/campaigns/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await marketingStorage.deleteCampaign(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

// Settings - Campaign Types
router.get('/settings/campaign-types', async (req, res) => {
  try {
    const campaignTypes = await marketingStorage.getAllCampaignTypes();
    res.json(campaignTypes);
  } catch (error) {
    console.error('Error fetching campaign types:', error);
    res.status(500).json({ error: 'Failed to fetch campaign types' });
  }
});

router.post('/settings/campaign-types', isAuthenticated, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Campaign type name is required' });
    }
    const campaignType = await marketingStorage.createCampaignType(name);
    res.status(201).json(campaignType);
  } catch (error) {
    console.error('Error creating campaign type:', error);
    res.status(500).json({ error: 'Failed to create campaign type' });
  }
});

// Settings - Influence Methods  
router.get('/settings/influence-methods', async (req, res) => {
  try {
    const influenceMethods = await marketingStorage.getAllInfluenceMethods();
    res.json(influenceMethods);
  } catch (error) {
    console.error('Error fetching influence methods:', error);
    res.status(500).json({ error: 'Failed to fetch influence methods' });
  }
});

router.post('/settings/influence-methods', isAuthenticated, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Influence method name is required' });
    }
    const influenceMethod = await marketingStorage.createInfluenceMethod(name);
    res.status(201).json(influenceMethod);
  } catch (error) {
    console.error('Error creating influence method:', error);
    res.status(500).json({ error: 'Failed to create influence method' });
  }
});

// Campaign customer management
router.get('/campaigns/:id/customers', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    console.log('📋 GET /campaigns/:id/customers - Campaign ID:', campaignId);
    const customers = await marketingStorage.getCampaignCustomers(campaignId);
    console.log('📊 Found customers for campaign:', customers.length);
    if (customers.length > 0) {
      console.log('📝 Customer details:', customers.map(c => ({
        id: c.id,
        name: c.opportunity.name,
        stage: c.stage,
        year1Arr: c.year1Arr,
        tcv: c.tcv
      })));
    }
    res.json(customers);
  } catch (error) {
    console.error('❌ Error fetching campaign customers:', error);
    res.status(500).json({ error: 'Failed to fetch campaign customers' });
  }
});

router.post('/campaigns/:id/customers', isAuthenticated, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    console.log('📝 POST /campaigns/:id/customers - Request body:', req.body);
    
    const dataToValidate = {
      ...req.body,
      campaignId,
      // Convert ISO string to Date object for validation
      snapshotDate: req.body.snapshotDate ? new Date(req.body.snapshotDate) : new Date()
    };
    
    console.log('📊 Data to validate:', dataToValidate);
    const validatedData = insertCampaignCustomerSchema.parse(dataToValidate);
    console.log('✅ Validation successful:', validatedData);
    
    const association = await marketingStorage.addCustomerToCampaign(validatedData);
    console.log('✅ Customer added successfully:', association);
    res.status(201).json(association);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Validation error:', error.errors);
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('❌ Error adding customer to campaign:', error);
    res.status(500).json({ error: 'Failed to add customer to campaign', message: error.message });
  }
});

// Preview endpoint to check snapshot date before adding customer
router.post('/campaigns/:id/customers/preview', isAuthenticated, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    console.log('🔍 POST /campaigns/:id/customers/preview - Request body:', req.body);
    
    const { customerId, snapshotDate } = req.body;
    const opportunityId = parseInt(customerId);
    
    // Use marketingStorage method to preview the snapshot data that would be used
    const previewData = await marketingStorage.previewCustomerSnapshot(opportunityId, new Date(snapshotDate));
    
    res.json({
      actualSnapshotDate: previewData.snapshotDate,
      stage: previewData.stage,
      year1Arr: previewData.year1Value,
      tcv: previewData.tcv,
      closeDate: previewData.closeDate,
    });
  } catch (error) {
    console.error('❌ Error previewing customer data:', error);
    res.status(500).json({ error: 'Failed to preview customer data' });
  }
});

router.delete('/campaigns/:campaignId/customers/:opportunityId', isAuthenticated, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId);
    const opportunityId = parseInt(req.params.opportunityId);
    
    await marketingStorage.removeCustomerFromCampaign(campaignId, opportunityId);
    res.status(204).send();
  } catch (error) {
    console.error('Error removing customer from campaign:', error);
    res.status(500).json({ error: 'Failed to remove customer from campaign' });
  }
});

// Bulk import customers to campaign from 2/27/2025 or closest date
router.post('/campaigns/:id/customers/bulk-import', isAuthenticated, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const { customerNames, targetDate } = req.body;
    
    console.log('📦 Bulk import request:', { campaignId, customerCount: customerNames?.length, targetDate });
    
    if (!customerNames || !Array.isArray(customerNames)) {
      return res.status(400).json({ error: 'customerNames array is required' });
    }
    
    const parsedTargetDate = targetDate ? new Date(targetDate) : new Date('2025-02-27');
    
    const result = await marketingStorage.bulkImportCustomersToCampaign(
      campaignId, 
      customerNames, 
      parsedTargetDate
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error in bulk import:', error);
    res.status(500).json({ error: 'Failed to bulk import customers' });
  }
});

// Get recent customers from uploads for campaign association
router.get('/customers/recent', isAuthenticated, async (req, res) => {
  try {
    const customers = await marketingStorage.getRecentCustomersForCampaigns();
    res.json(customers);
  } catch (error) {
    console.error('Error fetching recent customers:', error);
    res.status(500).json({ error: 'Failed to fetch recent customers' });
  }
});

// Get analytics for a specific campaign - Updated with enhanced metrics
router.get('/analytics/campaign/:id', isAuthenticated, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    console.log('📊 Analytics requested for campaign:', campaignId);
    const analytics = await marketingStorage.getCampaignAnalytics(campaignId);
    console.log('📈 Analytics data returned:', JSON.stringify(analytics, null, 2));
    res.json(analytics);
  } catch (error) {
    console.error('❌ Error fetching campaign analytics:', error);
    res.status(500).json({ error: 'Failed to fetch campaign analytics' });
  }
});

// Customer snapshot preview endpoint
router.get('/customers/:id/preview', isAuthenticated, async (req, res) => {
  try {
    const opportunityId = parseInt(req.params.id);
    const targetDate = req.query.date ? new Date(req.query.date as string) : new Date();
    
    const preview = await marketingStorage.previewCustomerSnapshot(opportunityId, targetDate);
    res.json(preview);
  } catch (error) {
    console.error('Error previewing customer snapshot:', error);
    res.status(500).json({ error: 'Failed to preview customer snapshot' });
  }
});

export default router;