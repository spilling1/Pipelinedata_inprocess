import { db } from './db';
import { 
  campaigns, 
  campaignCustomers, 
  opportunities, 
  snapshots,
  campaignTypes,
  influenceMethods
} from '../shared/schema';
import { 
  Campaign, 
  CampaignCustomer, 
  InsertCampaign, 
  InsertCampaignCustomer,
  CampaignType,
  InfluenceMethod
} from '../shared/schema';
import { eq, and, desc, asc, sql, ne, or, inArray, isNull, isNotNull } from 'drizzle-orm';
import { gte, lte } from 'drizzle-orm';

export class MarketingStorage {
  // Helper method to normalize customer name for consistent grouping
  private normalizeCustomerName(clientName: string | null, opportunityName: string): string {
    const name = (clientName || opportunityName).trim();
    // Normalize common variations
    return name
      .replace(/,?\s*Inc\.?$/i, '') // Remove "Inc" or "Inc."
      .replace(/,?\s*LLC$/i, '') // Remove "LLC"
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  // Helper method to check if a customer name is valid (not empty, not just numbers/symbols)
  private isValidCustomerName(name: string | null): boolean {
    if (!name || name.trim().length === 0) return false;
    
    const trimmed = name.trim();
    
    // Reject names that are too short (less than 2 characters)
    if (trimmed.length < 2) return false;
    
    // Reject names that are just numbers
    if (/^\d+$/.test(trimmed)) return false;
    
    // Reject names that are just symbols or special characters
    if (/^[^a-zA-Z0-9\s]*$/.test(trimmed)) return false;
    
    // Reject common invalid patterns (but allow names like "3 Pillar")
    const invalidPatterns = [
      /^N\/A$/i,
      /^TBD$/i,
      /^Unknown$/i,
      /^Test$/i,
      /^null$/i,
      /^undefined$/i,
    ];
    
    return !invalidPatterns.some(pattern => pattern.test(trimmed));
  }

  // Helper method to check if a customer has valid identifying information
  private hasValidCustomerInfo(clientName: string | null, opportunityName: string | null): boolean {
    // Both are null/empty
    if (!clientName && !opportunityName) return false;
    
    // Check if we have at least one valid name
    const validClientName = this.isValidCustomerName(clientName);
    const validOpportunityName = this.isValidCustomerName(opportunityName);
    
    return validClientName || validOpportunityName;
  }

  // Campaign CRUD operations
  async getAllCampaigns(): Promise<Campaign[]> {
    return await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    const result = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    return result[0];
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [newCampaign] = await db.insert(campaigns).values({
      ...campaign,
      updatedAt: new Date(),
    }).returning();
    return newCampaign;
  }

  async updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign> {
    const [updatedCampaign] = await db.update(campaigns)
      .set({
        ...campaign,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, id))
      .returning();
    return updatedCampaign;
  }

  async deleteCampaign(id: number): Promise<void> {
    // First delete all campaign customers
    await db.delete(campaignCustomers).where(eq(campaignCustomers.campaignId, id));
    // Then delete the campaign
    await db.delete(campaigns).where(eq(campaigns.id, id));
  }

  // Campaign customer management - Customer-centric approach
  async getCampaignCustomers(campaignId: number): Promise<Array<CampaignCustomer & { opportunity: any }>> {
    console.log('🔍 getCampaignCustomers called for campaign:', campaignId);
    
    const allCustomers = await db
      .select({
        id: campaignCustomers.id,
        campaignId: campaignCustomers.campaignId,
        opportunityId: campaignCustomers.opportunityId,
        snapshotDate: campaignCustomers.snapshotDate,
        stage: campaignCustomers.stage,
        year1Arr: campaignCustomers.year1Arr,
        tcv: campaignCustomers.tcv,
        closeDate: campaignCustomers.closeDate,
        createdAt: campaignCustomers.createdAt,
        opportunity: {
          id: opportunities.id,
          opportunityId: opportunities.opportunityId,
          name: opportunities.name,
          clientName: opportunities.clientName,
          owner: opportunities.owner,
          createdDate: opportunities.createdDate,
        }
      })
      .from(campaignCustomers)
      .innerJoin(opportunities, eq(campaignCustomers.opportunityId, opportunities.id))
      .where(eq(campaignCustomers.campaignId, campaignId));

    console.log('📊 Found raw campaign customers:', allCustomers.length);

    // Group by normalized customer name and keep only one entry per customer
    const customerGroups = new Map<string, typeof allCustomers[0]>();
    
    for (const customer of allCustomers) {
      // Skip customers with invalid or missing names
      if (!this.hasValidCustomerInfo(customer.opportunity.clientName, customer.opportunity.name)) {
        console.log('🚫 Skipping customer with invalid/missing name:', customer.opportunity.clientName || customer.opportunity.name || 'NULL');
        continue;
      }

      const normalizedName = this.normalizeCustomerName(
        customer.opportunity.clientName, 
        customer.opportunity.name
      );
      
      if (!customerGroups.has(normalizedName)) {
        customerGroups.set(normalizedName, customer);
      } else {
        // Keep the one with the most recent opportunity creation date
        const existing = customerGroups.get(normalizedName)!;
        const currentDate = new Date(customer.opportunity.createdDate || 0);
        const existingDate = new Date(existing.opportunity.createdDate || 0);
        
        if (currentDate > existingDate) {
          customerGroups.set(normalizedName, customer);
        }
      }
    }

    const result = Array.from(customerGroups.values()).sort((a, b) => 
      (a.opportunity.clientName || a.opportunity.name).localeCompare(
        b.opportunity.clientName || b.opportunity.name
      )
    );

    console.log('📊 After customer-centric grouping:', result.length, 'unique customers');
    return result;
  }

  async addCustomerToCampaign(data: InsertCampaignCustomer): Promise<CampaignCustomer> {
    console.log('📝 Adding customer to campaign:', {
      campaignId: data.campaignId,
      opportunityId: data.opportunityId,
      snapshotDate: data.snapshotDate
    });

    const targetDate = new Date(data.snapshotDate);
    
    // Get snapshot data from the specified date or the closest date after it
    const snapshot = await db.select()
      .from(snapshots)
      .where(
        and(
          eq(snapshots.opportunityId, data.opportunityId),
          gte(snapshots.snapshotDate, targetDate)
        )
      )
      .orderBy(asc(snapshots.snapshotDate))
      .limit(1);

    let snapshotData;
    if (snapshot.length === 0) {
      // Try to find closest before target date
      const fallbackSnapshot = await db.select()
        .from(snapshots)
        .where(eq(snapshots.opportunityId, data.opportunityId))
        .orderBy(desc(snapshots.snapshotDate))
        .limit(1);

      if (fallbackSnapshot.length === 0) {
        throw new Error('No snapshot data available for this opportunity');
      }
      snapshotData = fallbackSnapshot[0];
    } else {
      snapshotData = snapshot[0];
    }
    
    const [association] = await db.insert(campaignCustomers).values({
      ...data,
      stage: snapshotData.stage || null,
      year1Arr: snapshotData.year1Value || null,
      tcv: snapshotData.tcv || null,
      closeDate: snapshotData.closeDate || null,
      snapshotDate: snapshotData.snapshotDate,
      createdAt: new Date(),
    }).returning();
    
    console.log('✅ Successfully added customer to campaign:', association.id);
    return association;
  }

  async removeCustomerFromCampaign(campaignId: number, opportunityId: number): Promise<void> {
    await db.delete(campaignCustomers)
      .where(
        and(
          eq(campaignCustomers.campaignId, campaignId),
          eq(campaignCustomers.opportunityId, opportunityId)
        )
      );
  }

  async bulkImportCustomersToCampaign(campaignId: number, customerNames: string[], targetDate: Date): Promise<{
    successful: Array<{ name: string; opportunityId: number; snapshotDate: string }>;
    failed: Array<{ name: string; reason: string }>;
  }> {
    console.log('📦 Starting bulk import for campaign:', campaignId);
    console.log('📋 Customer names:', customerNames.length);
    console.log('📅 Target date:', targetDate.toISOString().split('T')[0]);

    const successful: Array<{ name: string; opportunityId: number; snapshotDate: string }> = [];
    const failed: Array<{ name: string; reason: string }> = [];

    for (const customerName of customerNames) {
      try {
        // Find opportunity by name (case-insensitive, also try client name)
        const foundOpportunities = await db.select()
          .from(opportunities)
          .where(
            or(
              sql`LOWER(${opportunities.name}) = LOWER(${customerName})`,
              sql`LOWER(${opportunities.clientName}) = LOWER(${customerName})`
            )
          );

        if (foundOpportunities.length === 0) {
          failed.push({ name: customerName, reason: 'Opportunity not found in database' });
          continue;
        }

        // For multiple opportunities with same name, select the most recent one
        let opportunity;
        if (foundOpportunities.length > 1) {
          opportunity = foundOpportunities.sort((a, b) => {
            const dateA = new Date(a.createdDate || 0);
            const dateB = new Date(b.createdDate || 0);
            return dateB.getTime() - dateA.getTime();
          })[0];
          console.log(`📋 Found ${foundOpportunities.length} opportunities for "${customerName}", using most recent: ${opportunity.opportunityId}`);
        } else {
          opportunity = foundOpportunities[0];
        }

        // Check if customer already exists in campaign using normalized names
        const normalizedNewCustomer = this.normalizeCustomerName(
          opportunity.clientName, 
          opportunity.name
        );
        
        const existingCustomers = await db
          .select({
            id: campaignCustomers.id,
            opportunityId: campaignCustomers.opportunityId,
            clientName: opportunities.clientName,
            opportunityName: opportunities.name,
          })
          .from(campaignCustomers)
          .innerJoin(opportunities, eq(campaignCustomers.opportunityId, opportunities.id))
          .where(eq(campaignCustomers.campaignId, campaignId));

        // Check if this customer (by normalized name) already exists
        const customerExists = existingCustomers.some(existing => {
          const normalizedExisting = this.normalizeCustomerName(
            existing.clientName, 
            existing.opportunityName
          );
          return normalizedExisting === normalizedNewCustomer;
        });

        if (customerExists) {
          failed.push({ name: customerName, reason: 'Customer already exists in campaign' });
          continue;
        }

        // Get snapshot data from target date or closest after
        const snapshot = await db.select()
          .from(snapshots)
          .where(
            and(
              eq(snapshots.opportunityId, opportunity.id),
              gte(snapshots.snapshotDate, targetDate)
            )
          )
          .orderBy(asc(snapshots.snapshotDate))
          .limit(1);

        let snapshotData;
        let actualSnapshotDate;

        if (snapshot.length === 0) {
          // Try to find closest before target date
          const fallbackSnapshot = await db.select()
            .from(snapshots)
            .where(eq(snapshots.opportunityId, opportunity.id))
            .orderBy(desc(snapshots.snapshotDate))
            .limit(1);

          if (fallbackSnapshot.length === 0) {
            failed.push({ name: customerName, reason: 'No snapshot data available' });
            continue;
          }

          snapshotData = fallbackSnapshot[0];
          actualSnapshotDate = fallbackSnapshot[0].snapshotDate;
        } else {
          snapshotData = snapshot[0];
          actualSnapshotDate = snapshot[0].snapshotDate;
        }

        // Add to campaign
        await db.insert(campaignCustomers).values({
          campaignId: campaignId,
          opportunityId: opportunity.id,
          snapshotDate: actualSnapshotDate,
          stage: snapshotData.stage,
          year1Arr: snapshotData.year1Value || 0,
          tcv: snapshotData.tcv || 0,
          closeDate: snapshotData.expectedCloseDate,
        });

        successful.push({ 
          name: customerName, 
          opportunityId: opportunity.id,
          snapshotDate: actualSnapshotDate.toISOString().split('T')[0]
        });

      } catch (error) {
        console.error(`❌ Error processing ${customerName}:`, error);
        failed.push({ name: customerName, reason: `Processing error: ${(error as Error).message}` });
      }
    }

    console.log('✅ Bulk import completed:', { successful: successful.length, failed: failed.length });
    return { successful, failed };
  }

  async previewCustomerSnapshot(opportunityId: number, targetDate: Date): Promise<{
    snapshotDate: Date;
    stage: string | null;
    year1Value: number | null;
    tcv: number | null;
    closeDate: Date | null;
  }> {
    console.log('🔍 Previewing snapshot for opportunity:', opportunityId, 'target date:', targetDate.toISOString().split('T')[0]);

    // Get snapshot data from the specified date or the closest date after it
    const snapshot = await db.select()
      .from(snapshots)
      .where(
        and(
          eq(snapshots.opportunityId, opportunityId),
          gte(snapshots.snapshotDate, targetDate)
        )
      )
      .orderBy(asc(snapshots.snapshotDate))
      .limit(1);

    if (snapshot.length === 0) {
      // Try to find closest before target date
      const fallbackSnapshot = await db.select()
        .from(snapshots)
        .where(eq(snapshots.opportunityId, opportunityId))
        .orderBy(desc(snapshots.snapshotDate))
        .limit(1);

      if (fallbackSnapshot.length === 0) {
        throw new Error('No snapshot data available for this opportunity');
      }

      const data = fallbackSnapshot[0];
      return {
        snapshotDate: data.snapshotDate,
        stage: data.stage,
        year1Value: data.year1Value,
        tcv: data.tcv,
        closeDate: data.expectedCloseDate,
      };
    }

    const data = snapshot[0];
    return {
      snapshotDate: data.snapshotDate,
      stage: data.stage,
      year1Value: data.year1Value,
      tcv: data.tcv,
      closeDate: data.expectedCloseDate,
    };
  }

  // Enhanced campaign analytics with customer-centric calculations
  async getCampaignAnalytics(campaignId: number): Promise<{
    currentClosedWon: { value: number; count: number };
    currentOpenOpportunities: { count: number; value: number };
    currentWinRate: number;
    startingOpportunities: number;
    startingPipelineValue: number;
    totalCampaignPipeline: number;
    closeRate: number;
    cac: number | null;
  }> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Get unique customers (customer-centric) instead of all opportunities
    const uniqueCustomers = await this.getCampaignCustomers(campaignId);
    
    if (uniqueCustomers.length === 0) {
      return {
        currentClosedWon: { value: 0, count: 0 },
        currentOpenOpportunities: { count: 0, value: 0 },
        currentWinRate: 0,
        startingOpportunities: 0,
        startingPipelineValue: 0,
        totalCampaignPipeline: 0,
        closeRate: 0,
        cac: null,
      };
    }

    // Get current snapshots for unique customers only
    const currentSnapshots = await this.getCurrentSnapshotsForCampaign(campaignId);
    
    // Filter snapshots to include customers who are in pipeline stages (not just based on enteredPipeline field)
    const pipelineSnapshots = currentSnapshots.filter(s => {
      // Include if they have enteredPipeline populated OR if they're in active pipeline stages
      return s.enteredPipeline !== null || 
             (s.stage !== 'Closed Won' && s.stage !== 'Closed Lost' && s.stage !== null);
    });
    
    // Calculate current metrics - EXCLUDE customers who were already "Closed Won" when added to campaign
    // ALSO EXCLUDE customers whose current close date is before campaign start date
    // Only count customers who have entered pipeline
    const closedWonSnapshots = pipelineSnapshots.filter(s => {
      const campaignCustomer = uniqueCustomers.find(c => c.opportunityId === s.opportunityId);
      
      // Exclude if originally "Closed Won" when added to campaign
      if (campaignCustomer?.stage === 'Closed Won') {
        return false;
      }
      
      // Exclude if current close date is before campaign start date
      if (s.closeDate && campaign.startDate) {
        const closeDate = new Date(s.closeDate);
        const campaignStartDate = new Date(campaign.startDate);
        if (closeDate < campaignStartDate) {
          return false;
        }
      }
      
      return s.stage === 'Closed Won';
    });

    // Active customers: All customers who entered pipeline and are not Closed Won/Lost
    const activeSnapshots = pipelineSnapshots.filter(s => {
      const campaignCustomer = uniqueCustomers.find(c => c.opportunityId === s.opportunityId);
      
      // Exclude if originally "Closed Won" when added to campaign
      if (campaignCustomer?.stage === 'Closed Won') {
        return false;
      }
      
      // Include all non-closed stages (active pipeline)
      // Note: We don't filter by close date here since that would exclude legitimate open opportunities
      return s.stage !== 'Closed Won' && s.stage !== 'Closed Lost';
    });

    // Current metrics
    const currentClosedWon = {
      value: closedWonSnapshots.reduce((sum, s) => sum + (s.year1Arr || 0), 0),
      count: closedWonSnapshots.length
    };

    // Update to use all active customers (not just specific stages)
    const currentOpenOpportunities = {
      count: activeSnapshots.length,
      value: activeSnapshots.reduce((sum, s) => sum + (s.year1Arr || 0), 0)
    };

    // Debug logging for active customers calculation
    console.log('Active Customers Calculation:', {
      activeCount: activeSnapshots.length,
      activeValue: currentOpenOpportunities.value,
      breakdown: activeSnapshots.map(s => ({
        opportunityId: s.opportunityId,
        stage: s.stage,
        year1Arr: s.year1Arr
      }))
    });

    // Win Rate Calculation (Customer-Centric):
    // Group snapshots by customer name to avoid double-counting customers with multiple opportunities
    type SnapshotData = {
      opportunityId: number;
      stage: string;
      year1Arr: number | null;
      tcv: number | null;
      snapshotDate: string;
      enteredPipeline: Date | null;
      closeDate: Date | null;
      isOutdated?: boolean;
      outdatedNote?: string;
    };
    
    const customerGroups = new Map<string, SnapshotData[]>();
    
    for (const snapshot of pipelineSnapshots) {
      const campaignCustomer = uniqueCustomers.find(c => c.opportunityId === snapshot.opportunityId);
      
      // Skip if originally "Closed Won" when added to campaign
      if (campaignCustomer?.stage === 'Closed Won') {
        continue;
      }
      
      // Skip if current close date is before campaign start date
      if (snapshot.closeDate && campaign.startDate) {
        const closeDate = new Date(snapshot.closeDate);
        const campaignStartDate = new Date(campaign.startDate);
        if (closeDate < campaignStartDate) {
          continue;
        }
      }
      
      const customerName = this.normalizeCustomerName(
        campaignCustomer?.opportunity.clientName, 
        campaignCustomer?.opportunity.name || 'Unknown'
      );
      
      if (!customerGroups.has(customerName)) {
        customerGroups.set(customerName, []);
      }
      customerGroups.get(customerName)!.push(snapshot);
    }

    // For each customer, determine their best status (Closed Won > Open > Closed Lost)
    const closedLostCustomers: string[] = [];
    
    for (const [customerName, customerSnapshots] of Array.from(customerGroups.entries())) {
      const campaignCustomer = uniqueCustomers.find(c => {
        const name = this.normalizeCustomerName(c.opportunity.clientName, c.opportunity.name);
        return name === customerName;
      });
      
      // Skip if customer was already "Closed Won" when added to campaign
      if (campaignCustomer?.stage === 'Closed Won') continue;
      
      // Check if customer has any Closed Won opportunities
      const hasClosedWon = customerSnapshots.some((s: SnapshotData) => s.stage === 'Closed Won');
      
      // Check if customer has any open opportunities
      const hasOpen = customerSnapshots.some((s: SnapshotData) => 
        s.stage !== 'Closed Won' && 
        s.stage !== 'Closed Lost' && 
        s.stage !== 'Validation' && 
        s.stage !== 'Introduction'
      );
      
      // If customer has no Closed Won and no Open, they are Closed Lost
      if (!hasClosedWon && !hasOpen) {
        const hasClosedLost = customerSnapshots.some((s: SnapshotData) => s.stage === 'Closed Lost');
        if (hasClosedLost) {
          closedLostCustomers.push(customerName);
        }
      }
    }

    // Placeholder for win rate - will be calculated after totalCampaignPipelineSnapshots is defined
    let currentWinRate = 0;
    
    console.log('🔴 Closed Lost Customers (Customer-Centric):');
    closedLostCustomers.forEach((customerName: string, index: number) => {
      console.log(`${index + 1}. ${customerName}`);
    });

    // Starting metrics (from campaign_customer table) - exclude pre-existing closed won
    // Also exclude customers whose current close date is before campaign start date
    // Only count customers who have entered pipeline in current snapshots
    const customersWithPipeline = uniqueCustomers.filter(c => {
      const hasPipeline = currentSnapshots.find(s => s.opportunityId === c.opportunityId && s.enteredPipeline !== null);
      
      // Exclude if originally "Closed Won" when added to campaign
      if (c.stage === 'Closed Won') {
        return false;
      }
      
      // Exclude if current close date is before campaign start date
      const currentSnapshot = currentSnapshots.find(s => s.opportunityId === c.opportunityId);
      if (currentSnapshot?.closeDate && campaign.startDate) {
        const closeDate = new Date(currentSnapshot.closeDate);
        const campaignStartDate = new Date(campaign.startDate);
        if (closeDate < campaignStartDate) {
          return false;
        }
      }
      
      return hasPipeline;
    });
    const startingOpportunities = customersWithPipeline.length;
    const startingPipelineValue = customersWithPipeline.reduce((sum, c) => sum + (c.year1Arr || 0), 0);



    // Total Campaign Pipeline: All customers who entered pipeline AND have close dates after campaign start
    // This includes both open and closed (won/lost) customers
    const totalCampaignPipelineSnapshots = pipelineSnapshots.filter(s => {
      // Must have entered pipeline
      if (!s.enteredPipeline) return false;
      
      // Must have close date after campaign start
      if (!s.closeDate || !campaign.startDate) return false;
      
      const closeDate = new Date(s.closeDate);
      const campaignStartDate = new Date(campaign.startDate);
      return closeDate > campaignStartDate;
    });

    const totalCampaignPipeline = totalCampaignPipelineSnapshots.reduce((sum, s) => sum + (s.year1Arr || 0), 0);

    // Debug logging for total campaign pipeline
    console.log('Total Campaign Pipeline Calculation:', {
      totalCustomers: totalCampaignPipelineSnapshots.length,
      totalValue: totalCampaignPipeline,
      criteria: 'Entered Pipeline + Close Date After Campaign Start'
    });

    // Now calculate Win Rate using your formula: Closed Won / (Total Pipeline - Active Customers)
    const totalPipelineCustomers = totalCampaignPipelineSnapshots.length;
    const activeCustomers = activeSnapshots.length;
    const nonActiveCustomers = totalPipelineCustomers - activeCustomers;
    
    currentWinRate = nonActiveCustomers > 0 
      ? currentClosedWon.count / nonActiveCustomers
      : 0;

    // Debug logging for Win Rate
    console.log('Win Rate Calculation (Updated Formula):', {
      closedWonCount: currentClosedWon.count,
      totalPipelineCustomers: totalPipelineCustomers,
      activeCustomers: activeCustomers,
      nonActiveCustomers: nonActiveCustomers,
      winRate: currentWinRate,
      winRatePercent: currentWinRate * 100,
      formula: `${currentClosedWon.count} / (${totalPipelineCustomers} - ${activeCustomers})`
    });

    // Close Rate using your formula: Closed Won / Total Pipeline
    const closeRate = totalPipelineCustomers > 0 
      ? currentClosedWon.count / totalPipelineCustomers
      : 0;

    // Debug logging for Close Rate
    console.log('Close Rate Calculation (Updated Formula):', {
      closedWonCount: currentClosedWon.count,
      totalPipelineCustomers: totalPipelineCustomers,
      closeRate: closeRate,
      closeRatePercent: closeRate * 100,
      formula: `${currentClosedWon.count} / ${totalPipelineCustomers}`
    });

    // CAC: Budget / current closed won count
    const cac = campaign.cost && currentClosedWon.count > 0 
      ? campaign.cost / currentClosedWon.count 
      : null;

    return {
      currentClosedWon,
      currentOpenOpportunities,
      currentWinRate,
      startingOpportunities,
      startingPipelineValue,
      totalCampaignPipeline,
      closeRate,
      cac,
    };
  }

  // Get customers who are "Closed Won" and were NOT already "Closed Won" when added to campaign
  async getCampaignClosedWonCustomers(campaignId: number): Promise<Array<{
    opportunityId: number;
    customerName: string;
    stage: string;
    year1Arr: number | null;
    tcv: number | null;
    snapshotDate: string;
    enteredPipeline: Date | null;
  }>> {
    const uniqueCustomers = await this.getCampaignCustomers(campaignId);
    const currentSnapshots = await this.getCurrentSnapshotsForCampaign(campaignId);
    
    const closedWonCustomers = currentSnapshots.filter(s => {
      const campaignCustomer = uniqueCustomers.find(c => c.opportunityId === s.opportunityId);
      return s.stage === 'Closed Won' && campaignCustomer?.stage !== 'Closed Won';
    });

    return closedWonCustomers.map(snapshot => {
      const customer = uniqueCustomers.find(c => c.opportunityId === snapshot.opportunityId);
      return {
        opportunityId: snapshot.opportunityId,
        customerName: customer?.opportunity.clientName || customer?.opportunity.name || 'Unknown',
        stage: snapshot.stage,
        year1Arr: snapshot.year1Arr,
        tcv: snapshot.tcv,
        snapshotDate: snapshot.snapshotDate,
        enteredPipeline: snapshot.enteredPipeline,
      };
    });
  }

  // Get customers with pipeline entry who are not Closed Won/Lost and were not pre-existing Closed Won
  async getCampaignPipelineCustomers(campaignId: number): Promise<Array<{
    opportunityId: number;
    customerName: string;
    stage: string;
    year1Arr: number | null;
    tcv: number | null;
    snapshotDate: string;
    enteredPipeline: Date | null;
    closeDate: Date | null;
  }>> {
    const uniqueCustomers = await this.getCampaignCustomers(campaignId);
    const currentSnapshots = await this.getCurrentSnapshotsForCampaign(campaignId);
    
    const pipelineCustomers = currentSnapshots.filter(s => {
      const campaignCustomer = uniqueCustomers.find(c => c.opportunityId === s.opportunityId);
      return s.enteredPipeline !== null && 
             s.stage !== 'Closed Won' && 
             s.stage !== 'Closed Lost' &&
             campaignCustomer?.stage !== 'Closed Won';
    });

    return pipelineCustomers.map(snapshot => {
      const customer = uniqueCustomers.find(c => c.opportunityId === snapshot.opportunityId);
      return {
        opportunityId: snapshot.opportunityId,
        customerName: customer?.opportunity.clientName || customer?.opportunity.name || 'Unknown',
        stage: snapshot.stage,
        year1Arr: snapshot.year1Arr,
        tcv: snapshot.tcv,
        snapshotDate: snapshot.snapshotDate,
        enteredPipeline: snapshot.enteredPipeline,
        closeDate: snapshot.closeDate || null,
      };
    });
  }

  // Get current snapshots for unique customers with latest close date logic
  async getCurrentSnapshotsForCampaign(campaignId: number): Promise<Array<{
    opportunityId: number;
    stage: string;
    year1Arr: number | null;
    tcv: number | null;
    snapshotDate: string;
    enteredPipeline: Date | null;
    closeDate: Date | null;
    isOutdated?: boolean;
    outdatedNote?: string;
  }>> {
    console.log('🔍 getCurrentSnapshotsForCampaign called for campaign:', campaignId);
    
    // Get unique customers from campaign
    const uniqueCustomers = await this.getCampaignCustomers(campaignId);
    console.log('📊 Found campaign customers:', uniqueCustomers.length);
    
    if (uniqueCustomers.length === 0) {
      return [];
    }

    const result: Array<{
      opportunityId: number;
      stage: string;
      year1Arr: number | null;
      tcv: number | null;
      snapshotDate: string;
      enteredPipeline: Date | null;
      closeDate: Date | null;
      isOutdated?: boolean;
      outdatedNote?: string;
    }> = [];

    // Get system-wide latest snapshot date for outdated data detection
    const [systemLatestSnapshot] = await db
      .select({ latestDate: sql<Date>`MAX(${snapshots.snapshotDate})` })
      .from(snapshots);
    
    const systemLatestDate = systemLatestSnapshot?.latestDate;
    const cutoffDays = 7;
    const cutoffDate = systemLatestDate ? new Date(systemLatestDate) : new Date();
    cutoffDate.setDate(cutoffDate.getDate() - cutoffDays);

    // For each campaign customer, get their latest snapshot directly
    for (const customer of uniqueCustomers) {
      console.log(`🔍 Processing customer: ${customer.opportunity.name} (ID: ${customer.opportunityId})`);
      
      // First try to find snapshots for the original opportunity
      let opportunitySnapshots = await db
        .select({
          opportunityId: snapshots.opportunityId,
          stage: snapshots.stage,
          year1Arr: snapshots.year1Value,
          tcv: snapshots.tcv,
          snapshotDate: snapshots.snapshotDate,
          closeDate: snapshots.expectedCloseDate,
          enteredPipeline: snapshots.enteredPipeline,
        })
        .from(snapshots)
        .where(eq(snapshots.opportunityId, customer.opportunityId))
        .orderBy(desc(snapshots.snapshotDate), desc(snapshots.expectedCloseDate));

      // If no recent snapshots found, try to find newer opportunity with suffixed ID
      if (opportunitySnapshots.length === 0 || opportunitySnapshots[0].snapshotDate < cutoffDate) {
        console.log(`🔍 Searching for newer opportunity with suffixed ID for ${customer.opportunity.name}`);
        console.log(`   Original opportunityId: ${customer.opportunity.opportunityId}`);
        console.log(`   Has snapshots: ${opportunitySnapshots.length > 0}, Latest date: ${opportunitySnapshots[0]?.snapshotDate}`);
        console.log(`   Cutoff date: ${cutoffDate.toISOString()}`);
        
        // Extract first 15 characters as base ID for matching
        const baseOpportunityId = customer.opportunity.opportunityId.substring(0, 15);
        
        console.log(`   Base opportunityId (first 15): ${baseOpportunityId}`);
        
        // Look for opportunities that start with the same 15 characters but are different records
        const newerOpportunities = await db
          .select({
            id: opportunities.id,
            opportunityId: opportunities.opportunityId,
            name: opportunities.name,
          })
          .from(opportunities)
          .where(
            and(
              sql`LEFT(${opportunities.opportunityId}, 15) = ${baseOpportunityId}`,
              ne(opportunities.id, customer.opportunityId) // Exclude the original opportunity
            )
          );

        if (newerOpportunities.length > 0) {
          // Get snapshots from the newer opportunity records
          const newerSnapshots = await db
            .select({
              opportunityId: snapshots.opportunityId,
              stage: snapshots.stage,
              year1Arr: snapshots.year1Value,
              tcv: snapshots.tcv,
              snapshotDate: snapshots.snapshotDate,
              closeDate: snapshots.expectedCloseDate,
              enteredPipeline: snapshots.enteredPipeline,
            })
            .from(snapshots)
            .where(inArray(snapshots.opportunityId, newerOpportunities.map(o => o.id)))
            .orderBy(desc(snapshots.snapshotDate), desc(snapshots.expectedCloseDate));

          if (newerSnapshots.length > 0) {
            opportunitySnapshots = newerSnapshots;
          }
        }
      }

      if (opportunitySnapshots.length === 0) {
        console.log(`❌ No snapshots found for opportunity ${customer.opportunityId}`);
        continue;
      }

      // Get the most recent snapshot
      const latestSnapshot = opportunitySnapshots[0];
      console.log(`📊 Latest snapshot for ${customer.opportunity.name}: ${latestSnapshot.stage} on ${latestSnapshot.snapshotDate}`);

      // Check if data is outdated
      const isOutdated = latestSnapshot.snapshotDate < cutoffDate;
      
      result.push({
        opportunityId: customer.opportunityId, // Use original customer's opportunity ID for frontend matching
        stage: latestSnapshot.stage || 'Unknown', // Preserve original stage data for marketing analytics
        year1Arr: latestSnapshot.year1Arr,
        tcv: latestSnapshot.tcv,
        snapshotDate: latestSnapshot.snapshotDate.toISOString(),
        enteredPipeline: latestSnapshot.enteredPipeline,
        closeDate: latestSnapshot.closeDate,
        isOutdated,
        outdatedNote: isOutdated ? `No data after ${latestSnapshot.snapshotDate.toISOString().split('T')[0]}` : undefined
      });
    }

    return result;
  }

  // Get recent customers for dropdowns - customer-centric with latest close date
  async getRecentCustomersForCampaigns(): Promise<Array<{
    opportunityId: number;
    opportunityName: string;
    clientName?: string;
    stage?: string;
    year1Arr?: number;
    tcv?: number;
    latestSnapshotDate: string;
  }>> {
    try {
      // Get all opportunities with their latest snapshots
      const allSnapshots = await db
        .select({
          opportunityId: opportunities.id,
          opportunityName: opportunities.name,
          clientName: opportunities.clientName,
          stage: snapshots.stage,
          year1Arr: snapshots.year1Value,
          tcv: snapshots.tcv,
          snapshotDate: snapshots.snapshotDate,
          closeDate: snapshots.expectedCloseDate,
        })
        .from(opportunities)
        .innerJoin(snapshots, eq(opportunities.id, snapshots.opportunityId))
        .orderBy(desc(snapshots.snapshotDate), desc(snapshots.expectedCloseDate));

      if (allSnapshots.length === 0) {
        return [];
      }

      // Group by normalized customer name
      const customerGroups = new Map<string, typeof allSnapshots[0][]>();
      
      for (const snapshot of allSnapshots) {
        // Skip customers with invalid or missing names
        if (!this.hasValidCustomerInfo(snapshot.clientName, snapshot.opportunityName)) {
          continue;
        }

        const normalizedName = this.normalizeCustomerName(
          snapshot.clientName, 
          snapshot.opportunityName
        );
        
        if (!customerGroups.has(normalizedName)) {
          customerGroups.set(normalizedName, []);
        }
        customerGroups.get(normalizedName)!.push(snapshot);
      }

      const result: Array<{
        opportunityId: number;
        opportunityName: string;
        clientName?: string;
        stage?: string;
        year1Arr?: number;
        tcv?: number;
        latestSnapshotDate: string;
      }> = [];

      // For each customer, find the opportunity with the latest close date from the most recent snapshot
      for (const [customerName, customerSnapshots] of customerGroups) {
        // Get the most recent snapshot date for this customer
        const latestSnapshotDate = customerSnapshots[0].snapshotDate;
        const latestSnapshots = customerSnapshots.filter(s => 
          s.snapshotDate.getTime() === latestSnapshotDate.getTime()
        );

        // Among the latest snapshots, find the one with the latest close date
        const bestSnapshot = latestSnapshots.reduce((best, current) => {
          const bestCloseDate = best.closeDate ? new Date(best.closeDate) : new Date(0);
          const currentCloseDate = current.closeDate ? new Date(current.closeDate) : new Date(0);
          return currentCloseDate > bestCloseDate ? current : best;
        });

        result.push({
          opportunityId: bestSnapshot.opportunityId,
          opportunityName: bestSnapshot.opportunityName,
          clientName: bestSnapshot.clientName || undefined,
          stage: bestSnapshot.stage || undefined,
          year1Arr: bestSnapshot.year1Arr || undefined,
          tcv: bestSnapshot.tcv || undefined,
          latestSnapshotDate: bestSnapshot.snapshotDate.toISOString().split('T')[0],
        });
      }

      // Sort by customer name
      return result.sort((a, b) => 
        (a.clientName || a.opportunityName).localeCompare(b.clientName || b.opportunityName)
      );

    } catch (error) {
      console.error('❌ Error fetching recent customers:', error);
      return [];
    }
  }

  // Settings methods
  async getAllCampaignTypes(): Promise<Array<{ id: number; name: string; isActive: number }>> {
    const result = await db.select().from(campaignTypes).where(eq(campaignTypes.isActive, 1));
    return result;
  }

  async createCampaignType(name: string): Promise<{ id: number; name: string; isActive: number }> {
    const [result] = await db.insert(campaignTypes).values({ name }).returning();
    return result;
  }

  async updateCampaignType(id: number, name: string): Promise<void> {
    await db.update(campaignTypes)
      .set({ name })
      .where(eq(campaignTypes.id, id));
  }

  async deleteCampaignType(id: number): Promise<void> {
    await db.delete(campaignTypes).where(eq(campaignTypes.id, id));
  }

  async getAllInfluenceMethods(): Promise<Array<{ id: number; name: string; isActive: number }>> {
    const result = await db.select().from(influenceMethods).where(eq(influenceMethods.isActive, 1));
    return result;
  }

  async createInfluenceMethod(name: string): Promise<{ id: number; name: string; isActive: number }> {
    const [result] = await db.insert(influenceMethods).values({ name }).returning();
    return result;
  }

  async updateInfluenceMethod(id: number, name: string): Promise<void> {
    await db.update(influenceMethods)
      .set({ name })
      .where(eq(influenceMethods.id, id));
  }

  async deleteInfluenceMethod(id: number): Promise<void> {
    await db.delete(influenceMethods).where(eq(influenceMethods.id, id));
  }

  async getCampaignStageMovements(campaignId: number, daysFromStart?: number): Promise<{
    movements: Array<{
      fromStage: string;
      toStage: string;
      count: number;
      customers: Array<{
        customerName: string;
        opportunityId: number;
        transitionDate: Date;
      }>;
    }>;
    newDeals: Array<{
      customerName: string;
      opportunityId: number;
      createdDate: Date;
      initialStage: string;
      currentStage: string;
      year1Arr: number | null;
    }>;
  }> {
    try {
      console.log(`📊 Getting stage movements for campaign ${campaignId}, days from start: ${daysFromStart || 'all time'}`);

      // Get campaign start date
      const campaign = await db
        .select({ startDate: campaigns.startDate })
        .from(campaigns)
        .where(eq(campaigns.id, campaignId))
        .limit(1);

      if (!campaign.length) {
        throw new Error(`Campaign ${campaignId} not found`);
      }

      const campaignStartDate = campaign[0].startDate;
      
      // Calculate the end date based on days from start
      let endDate: Date | null = null;
      if (daysFromStart && daysFromStart > 0) {
        endDate = new Date(campaignStartDate);
        endDate.setDate(endDate.getDate() + daysFromStart);
      }

      // Get all campaign customers
      const campaignCustomerIds = await db
        .select({ opportunityId: campaignCustomers.opportunityId })
        .from(campaignCustomers)
        .where(eq(campaignCustomers.campaignId, campaignId));

      if (campaignCustomerIds.length === 0) {
        return {
          movements: [],
          newDeals: []
        };
      }

      const opportunityIds = campaignCustomerIds.map(c => c.opportunityId);

      // Build the query for snapshots
      let whereConditions = [
        inArray(snapshots.opportunityId, opportunityIds),
        gte(snapshots.snapshotDate, campaignStartDate),
        isNotNull(snapshots.stage)
      ];

      // Add end date filter if specified
      if (endDate) {
        whereConditions.push(lte(snapshots.snapshotDate, endDate));
      }

      const snapshotsData = await db
        .select({
          opportunityId: snapshots.opportunityId,
          stage: snapshots.stage,
          snapshotDate: snapshots.snapshotDate,
          opportunityName: opportunities.name,
          clientName: opportunities.clientName,
        })
        .from(snapshots)
        .innerJoin(opportunities, eq(snapshots.opportunityId, opportunities.id))
        .where(and(...whereConditions))
        .orderBy(
          snapshots.opportunityId,
          snapshots.snapshotDate
        );

      console.log(`Found ${snapshotsData.length} snapshots for stage movement analysis`);

      // Group snapshots by opportunity and detect stage changes
      const opportunitySnapshots = new Map<number, Array<{
        stage: string;
        snapshotDate: Date;
        opportunityName: string;
        clientName: string | null;
      }>>();

      snapshotsData.forEach(snapshot => {
        if (!opportunitySnapshots.has(snapshot.opportunityId!)) {
          opportunitySnapshots.set(snapshot.opportunityId!, []);
        }
        opportunitySnapshots.get(snapshot.opportunityId!)!.push({
          stage: snapshot.stage!,
          snapshotDate: snapshot.snapshotDate,
          opportunityName: snapshot.opportunityName,
          clientName: snapshot.clientName,
        });
      });

      // Detect stage movements
      const stageMovements = new Map<string, {
        count: number;
        customers: Array<{
          customerName: string;
          opportunityId: number;
          transitionDate: Date;
        }>;
      }>();

      opportunitySnapshots.forEach((snapshots, opportunityId) => {
        // Sort snapshots by date
        snapshots.sort((a, b) => a.snapshotDate.getTime() - b.snapshotDate.getTime());

        // Look for stage changes
        for (let i = 1; i < snapshots.length; i++) {
          const prevSnapshot = snapshots[i - 1];
          const currSnapshot = snapshots[i];

          if (prevSnapshot.stage !== currSnapshot.stage) {
            const transitionKey = `${prevSnapshot.stage} → ${currSnapshot.stage}`;
            const customerName = this.normalizeCustomerName(currSnapshot.clientName, currSnapshot.opportunityName);

            if (!stageMovements.has(transitionKey)) {
              stageMovements.set(transitionKey, {
                count: 0,
                customers: []
              });
            }

            const movement = stageMovements.get(transitionKey)!;
            movement.count++;
            movement.customers.push({
              customerName,
              opportunityId,
              transitionDate: currSnapshot.snapshotDate
            });
          }
        }
      });

      // Convert movements to array format
      const movements = Array.from(stageMovements.entries()).map(([transition, data]) => {
        const [fromStage, toStage] = transition.split(' → ');
        return {
          fromStage,
          toStage,
          count: data.count,
          customers: data.customers.sort((a, b) => b.transitionDate.getTime() - a.transitionDate.getTime())
        };
      });

      // Sort by count descending
      movements.sort((a, b) => b.count - a.count);

      // Find newly created deals within the timeframe
      let newDealsWhereConditions = [
        inArray(opportunities.id, opportunityIds),
        gte(opportunities.createdDate, campaignStartDate),
        isNotNull(opportunities.createdDate)
      ];

      // Add end date filter if specified
      if (endDate) {
        newDealsWhereConditions.push(lte(opportunities.createdDate, endDate));
      }

      const newDealsData = await db
        .select({
          opportunityId: opportunities.id,
          opportunityName: opportunities.name,
          clientName: opportunities.clientName,
          createdDate: opportunities.createdDate,
        })
        .from(opportunities)
        .where(and(...newDealsWhereConditions))
        .orderBy(desc(opportunities.createdDate));

      console.log(`Found ${newDealsData.length} new deals created in timeframe`);

      // For each new deal, get their initial stage from first snapshot and current stage from latest snapshot
      const newDeals = [];
      for (const deal of newDealsData) {
        const firstSnapshot = await db
          .select({
            stage: snapshots.stage,
            snapshotDate: snapshots.snapshotDate,
          })
          .from(snapshots)
          .where(eq(snapshots.opportunityId, deal.opportunityId))
          .orderBy(snapshots.snapshotDate)
          .limit(1);

        const latestSnapshot = await db
          .select({
            stage: snapshots.stage,
            year1Arr: snapshots.year1Value,
            snapshotDate: snapshots.snapshotDate,
          })
          .from(snapshots)
          .where(eq(snapshots.opportunityId, deal.opportunityId))
          .orderBy(desc(snapshots.snapshotDate))
          .limit(1);

        const customerName = this.normalizeCustomerName(deal.clientName, deal.opportunityName);
        
        newDeals.push({
          customerName,
          opportunityId: deal.opportunityId,
          createdDate: deal.createdDate!,
          initialStage: firstSnapshot[0]?.stage || 'Unknown',
          currentStage: latestSnapshot[0]?.stage || 'Unknown',
          year1Arr: latestSnapshot[0]?.year1Arr || null
        });
      }

      console.log(`📊 Found ${movements.length} different stage movements and ${newDeals.length} new deals`);
      return {
        movements,
        newDeals: newDeals.sort((a, b) => b.createdDate.getTime() - a.createdDate.getTime())
      };

    } catch (error) {
      console.error('❌ Error getting campaign stage movements:', error);
      throw error;
    }
  }

  // Cleanup method to remove customers with invalid names from all campaigns
  async cleanupInvalidCustomerNames(): Promise<{ removed: number; details: Array<{ campaignId: number; customerName: string; opportunityId: number }> }> {
    console.log('🧹 Starting cleanup of customers with invalid names...');
    
    // Get all campaign customers with their opportunity details
    const allCampaignCustomers = await db
      .select({
        id: campaignCustomers.id,
        campaignId: campaignCustomers.campaignId,
        opportunityId: campaignCustomers.opportunityId,
        clientName: opportunities.clientName,
        opportunityName: opportunities.name,
      })
      .from(campaignCustomers)
      .innerJoin(opportunities, eq(campaignCustomers.opportunityId, opportunities.id));

    const toRemove: Array<{ campaignId: number; customerName: string; opportunityId: number; id: number }> = [];

    for (const customer of allCampaignCustomers) {
      // Check if customer has valid identifying information
      if (!this.hasValidCustomerInfo(customer.clientName, customer.opportunityName)) {
        toRemove.push({
          campaignId: customer.campaignId,
          customerName: customer.clientName || customer.opportunityName || 'NULL',
          opportunityId: customer.opportunityId,
          id: customer.id
        });
      }
    }

    // Remove invalid customers
    for (const customer of toRemove) {
      await db.delete(campaignCustomers).where(eq(campaignCustomers.id, customer.id));
      console.log(`🗑️ Removed invalid customer "${customer.customerName}" from campaign ${customer.campaignId}`);
    }

    console.log(`✅ Cleanup complete. Removed ${toRemove.length} customers with invalid names.`);
    
    return {
      removed: toRemove.length,
      details: toRemove.map(c => ({
        campaignId: c.campaignId,
        customerName: c.customerName,
        opportunityId: c.opportunityId
      }))
    };
  }
  /**
   * Get pipeline data by owner for a campaign
   * Pipeline is defined as: Entered Pipeline != null and Close date > campaign start date
   */
  async getCampaignPipelineByOwner(campaignId: number): Promise<Array<{
    owner: string;
    createdCount: number;
    createdValue: number;
    currentCount: number;
    currentValue: number;
    newDealsCount: number;
    newDealsValue: number;
    closedWonCount: number;
    closedWonValue: number;
    winRate: number;
  }>> {
    console.log('📊 Getting pipeline by owner for campaign:', campaignId);
    
    // Get campaign details
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) {
      console.log('❌ Campaign not found');
      return [];
    }

    // Get campaign customers
    const campaignCustomerData = await this.getCampaignCustomers(campaignId);
    if (campaignCustomerData.length === 0) {
      console.log('📊 No customers in campaign');
      return [];
    }

    console.log(`📊 Found ${campaignCustomerData.length} customers in campaign`);

    // Get all snapshots for campaign customers
    const opportunityIds = campaignCustomerData.map(c => c.opportunityId);
    
    const allSnapshots = await db
      .select({
        opportunityId: snapshots.opportunityId,
        snapshotDate: snapshots.snapshotDate,
        stage: snapshots.stage,
        year1Arr: snapshots.year1Value,
        closeDate: snapshots.expectedCloseDate,
        enteredPipeline: snapshots.enteredPipeline,
        owner: opportunities.owner,
      })
      .from(snapshots)
      .innerJoin(opportunities, eq(snapshots.opportunityId, opportunities.id))
      .where(inArray(snapshots.opportunityId, opportunityIds))
      .orderBy(snapshots.opportunityId, desc(snapshots.snapshotDate));

    console.log(`📊 Found ${allSnapshots.length} total snapshots for campaign customers`);

    // Group snapshots by opportunity to get latest for each
    const latestSnapshots = new Map<number, typeof allSnapshots[0]>();
    for (const snapshot of allSnapshots) {
      if (!latestSnapshots.has(snapshot.opportunityId!)) {
        latestSnapshots.set(snapshot.opportunityId!, snapshot);
      }
    }

    console.log(`📊 Latest snapshots: ${latestSnapshots.size}`);

    // Filter snapshots that qualify as pipeline (entered pipeline != null and close date > campaign start)
    const pipelineSnapshots = Array.from(latestSnapshots.values()).filter(s => {
      // Must have entered pipeline
      if (!s.enteredPipeline) return false;
      
      // Must have close date after campaign start
      if (!s.closeDate || !campaign.startDate) return false;
      
      const closeDate = new Date(s.closeDate);
      const campaignStartDate = new Date(campaign.startDate);
      return closeDate > campaignStartDate;
    });

    console.log(`📊 Pipeline snapshots (entered pipeline + close date > campaign start): ${pipelineSnapshots.length}`);

    // Get starting snapshots for each customer (from when they were added to campaign)
    const ownerPipelineData = new Map<string, {
      createdCount: number;
      createdValue: number;
      currentCount: number;
      currentValue: number;
      newDealsCount: number;
      newDealsValue: number;
      closedWonCount: number;
      closedWonValue: number;
      totalDealsCount: number;
    }>();

    // Get campaign start date for new deals calculation
    const campaignStartDate = new Date(campaign.startDate);

    // Process each campaign customer
    for (const customer of campaignCustomerData) {
      const latestSnapshot = latestSnapshots.get(customer.opportunityId);
      if (!latestSnapshot || !latestSnapshot.owner) continue;

      const owner = latestSnapshot.owner;
      
      // Check if this customer qualifies as pipeline
      const isPipeline = pipelineSnapshots.some(s => s.opportunityId === customer.opportunityId);
      if (!isPipeline) continue;

      // Initialize owner data if not exists
      if (!ownerPipelineData.has(owner)) {
        ownerPipelineData.set(owner, {
          createdCount: 0,
          createdValue: 0,
          currentCount: 0,
          currentValue: 0,
          newDealsCount: 0,
          newDealsValue: 0,
          closedWonCount: 0,
          closedWonValue: 0,
          totalDealsCount: 0
        });
      }

      const ownerData = ownerPipelineData.get(owner)!;

      // Count as created pipeline (from when customer was added)
      ownerData.createdCount++;
      ownerData.createdValue += customer.year1Arr || 0;
      ownerData.totalDealsCount++;

      // Check if this is a new deal (created within first 30 days of campaign AND has entered pipeline)
      const opportunityCreatedDate = customer.opportunity.createdDate;
      const enteredPipeline = latestSnapshot.enteredPipeline;
      
      if (opportunityCreatedDate && enteredPipeline) {
        const createdDate = new Date(opportunityCreatedDate);
        const thirtyDaysAfterCampaign = new Date(campaignStartDate);
        thirtyDaysAfterCampaign.setDate(thirtyDaysAfterCampaign.getDate() + 30);
        
        // Must be created between campaign start and 30 days after
        if (createdDate >= campaignStartDate && createdDate <= thirtyDaysAfterCampaign) {
          ownerData.newDealsCount++;
          ownerData.newDealsValue += customer.year1Arr || 0;
        }
      }

      // Check if this is closed won
      if (latestSnapshot.stage === 'Closed Won') {
        ownerData.closedWonCount++;
        ownerData.closedWonValue += latestSnapshot.year1Arr || 0;
      }

      // Count current pipeline value (exclude closed won/lost)
      if (latestSnapshot.stage !== 'Closed Won' && latestSnapshot.stage !== 'Closed Lost') {
        const currentYear1Arr = latestSnapshot.year1Arr || 0;
        ownerData.currentCount++;
        ownerData.currentValue += currentYear1Arr;
      }

      console.log(`📊 Owner ${owner}: +${customer.year1Arr || 0} created, current stage: ${latestSnapshot.stage}`);
    }

    // Convert to array format
    const result = Array.from(ownerPipelineData.entries()).map(([owner, data]) => ({
      owner,
      createdCount: data.createdCount,
      createdValue: data.createdValue,
      currentCount: data.currentCount,
      currentValue: data.currentValue,
      newDealsCount: data.newDealsCount,
      newDealsValue: data.newDealsValue,
      closedWonCount: data.closedWonCount,
      closedWonValue: data.closedWonValue,
      winRate: data.totalDealsCount > 0 ? data.closedWonCount / data.totalDealsCount : 0
    }));

    console.log(`📊 Pipeline by owner result: ${result.length} owners`);
    result.forEach(r => console.log(`  ${r.owner}: Created ${r.createdCount}/$${r.createdValue.toLocaleString()} → Current ${r.currentCount}/$${r.currentValue.toLocaleString()}`));

    return result;
  }

}

export const marketingStorage = new MarketingStorage();