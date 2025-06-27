import { db } from './db.js';
import { 
  campaigns, 
  campaignCustomers, 
  opportunities, 
  snapshots,
  campaignTypes,
  influenceMethods
} from '../shared/schema.js';
import { 
  Campaign, 
  CampaignCustomer, 
  InsertCampaign, 
  InsertCampaignCustomer,
  CampaignType,
  InfluenceMethod
} from '../shared/schema.js';
import { eq, and, desc, asc, sql, ne, or, inArray } from 'drizzle-orm';
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

  // Helper method to group customers by normalized name and return latest opportunity
  private groupCustomersByName<T extends { opportunity: { clientName: string | null; name: string; createdDate: Date | null } }>(
    customers: T[]
  ): T[] {
    const customerGroups = new Map<string, T>();
    
    for (const customer of customers) {
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

    return Array.from(customerGroups.values());
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
    // First delete all campaign-customer associations
    await db.delete(campaignCustomers).where(eq(campaignCustomers.campaignId, id));
    // Then delete the campaign
    await db.delete(campaigns).where(eq(campaigns.id, id));
  }

  // Campaign customer management
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

    // Use the helper method for consistent customer grouping
    const uniqueCustomers = this.groupCustomersByName(allCustomers);

    const result = uniqueCustomers.sort((a, b) => 
      (a.opportunity.clientName || a.opportunity.name).localeCompare(
        b.opportunity.clientName || b.opportunity.name
      )
    );

    console.log('📊 After customer-centric grouping:', result.length, 'unique customers');
    if (result.length > 0) {
      console.log('📝 Sample customer result:', {
        id: result[0].id,
        opportunityName: result[0].opportunity.name,
        clientName: result[0].opportunity.clientName,
        stage: result[0].stage,
        year1Arr: result[0].year1Arr
      });
    }

    return result;
  }

  async addCustomerToCampaign(data: InsertCampaignCustomer): Promise<CampaignCustomer> {
    console.log('📝 Adding customer to campaign:', {
      campaignId: data.campaignId,
      opportunityId: data.opportunityId,
      snapshotDate: data.snapshotDate
    });

    const targetDate = new Date(data.snapshotDate);
    console.log('🎯 Target snapshot date:', targetDate.toISOString().split('T')[0]);

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

    let snapshotData = snapshot[0];
    
    // If no snapshot found on or after the target date, get the latest one before
    if (!snapshotData) {
      console.log('⚠️ No snapshot found on or after target date, looking for closest earlier snapshot');
      const earlierSnapshot = await db.select()
        .from(snapshots)
        .where(
          and(
            eq(snapshots.opportunityId, data.opportunityId),
            lte(snapshots.snapshotDate, targetDate)
          )
        )
        .orderBy(desc(snapshots.snapshotDate))
        .limit(1);
      
      snapshotData = earlierSnapshot[0];
    }
    
    if (!snapshotData) {
      console.error('❌ No snapshot data found for opportunity:', data.opportunityId);
      throw new Error(`No snapshot data found for opportunity ${data.opportunityId}`);
    }

    console.log('📊 Using snapshot data from:', {
      snapshotDate: snapshotData.snapshotDate,
      stage: snapshotData.stage,
      year1Value: snapshotData.year1Value,
      tcv: snapshotData.tcv
    });
    
    const [association] = await db.insert(campaignCustomers).values({
      ...data,
      stage: snapshotData.stage || null,
      year1Arr: snapshotData.year1Value || null,
      tcv: snapshotData.tcv || null,
      closeDate: snapshotData.closeDate || null,
      snapshotDate: snapshotData.snapshotDate, // Use actual snapshot date
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
          // Sort by creation date descending and take the most recent
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
        failed.push({ name: customerName, reason: `Processing error: ${error.message}` });
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
          sql`${snapshots.snapshotDate} >= ${targetDate}`
        )
      )
      .orderBy(asc(snapshots.snapshotDate))
      .limit(1);

    if (snapshot.length === 0) {
      // No snapshots on or after the target date, get the most recent one before
      const fallbackSnapshot = await db.select()
        .from(snapshots)
        .where(eq(snapshots.opportunityId, opportunityId))
        .orderBy(desc(snapshots.snapshotDate))
        .limit(1);

      if (fallbackSnapshot.length === 0) {
        throw new Error('No snapshot data found for this opportunity');
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

  // Enhanced campaign analytics with proper current vs starting metrics
  async getCampaignAnalytics(campaignId: number): Promise<{
    // Current snapshot metrics
    currentClosedWon: { value: number; count: number };
    currentOpenOpportunities: { count: number; value: number };
    currentWinRate: number;
    
    // Starting metrics (from campaign_customer table)
    startingOpportunities: number;
    startingPipelineValue: number;
    closeRate: number;
    
    // CAC
    cac: number | null;
  }> {
    // Get campaign details for cost calculation
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Get all campaign customers with opportunity details (starting point)
    const allCampaignCustomers = await db
      .select({
        opportunityId: campaignCustomers.opportunityId,
        originalStage: campaignCustomers.stage,
        originalYear1Arr: campaignCustomers.year1Arr,
        clientName: opportunities.clientName,
        opportunityName: opportunities.name,
        createdDate: opportunities.createdDate,
      })
      .from(campaignCustomers)
      .innerJoin(opportunities, eq(campaignCustomers.opportunityId, opportunities.id))
      .where(eq(campaignCustomers.campaignId, campaignId));

    // Use helper method for consistent customer grouping by creating the right format
    const customersWithOpportunityFormat = allCampaignCustomers.map(customer => ({
      ...customer,
      opportunity: {
        clientName: customer.clientName,
        name: customer.opportunityName,
        createdDate: customer.createdDate
      }
    }));

    const campaignCustomerList = this.groupCustomersByName(customersWithOpportunityFormat);

    if (campaignCustomerList.length === 0) {
      return {
        currentClosedWon: { value: 0, count: 0 },
        currentOpenOpportunities: { count: 0, value: 0 },
        currentWinRate: 0,
        startingOpportunities: 0,
        startingPipelineValue: 0,
        closeRate: 0,
        cac: null,
      };
    }

    const opportunityIds = campaignCustomerList.map(c => c.opportunityId);

    // Get current snapshot data with outdated detection
    const currentSnapshotsWithOutdated = await this.getCurrentSnapshotsForCampaign(campaignId);
    
    // Transform to format expected by analytics, treating outdated customers as "Closed Lost"
    const currentSnapshots = currentSnapshotsWithOutdated.map(snapshot => ({
      opportunityId: snapshot.opportunityId,
      stage: snapshot.isOutdated ? 'Closed Lost' : snapshot.stage, // Treat outdated as Closed Lost
      year1Value: snapshot.year1Arr,
      snapshotDate: new Date(snapshot.snapshotDate),
    }));

    // Calculate current metrics - EXCLUDE customers who were already "Closed Won" when added to campaign
    const closedWonSnapshots = currentSnapshots.filter(s => {
      const campaignCustomer = campaignCustomerList.find(c => c.opportunityId === s.opportunityId);
      return s.stage === 'Closed Won' && campaignCustomer?.originalStage !== 'Closed Won';
    });

    const openSnapshots = currentSnapshots.filter(s => 
      s.stage !== 'Closed Won' && 
      s.stage !== 'Closed Lost' && 
      s.stage !== 'Validation' && 
      s.stage !== 'Introduction'
    );

    // Include both "Closed Lost" stage customers AND outdated customers in closed lost analytics
    const closedLostSnapshots = currentSnapshots.filter(s => 
      s.stage === 'Closed Lost'
    );

    // Current metrics
    const currentClosedWon = {
      value: closedWonSnapshots.reduce((sum, s) => sum + (s.year1Value || 0), 0),
      count: closedWonSnapshots.length
    };

    const currentOpenOpportunities = {
      count: openSnapshots.length,
      value: openSnapshots.reduce((sum, s) => sum + (s.year1Value || 0), 0)
    };

    const currentWinRate = (closedWonSnapshots.length + closedLostSnapshots.length) > 0
      ? closedWonSnapshots.length / (closedWonSnapshots.length + closedLostSnapshots.length)
      : 0;

    // Starting metrics (from campaign_customer table)
    const nonClosedWonAtStart = campaignCustomerList.filter(c => c.originalStage !== 'Closed Won');
    const startingOpportunities = nonClosedWonAtStart.length;
    const startingPipelineValue = nonClosedWonAtStart.reduce((sum, c) => sum + (c.originalYear1Arr || 0), 0);

    // Close rate: current closed won / total starting customers (excluding those already closed won)
    const closeRate = startingOpportunities > 0 
      ? currentClosedWon.count / startingOpportunities 
      : 0;

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
      closeRate,
      cac,
    };
  }

  // Get current snapshots for campaign customers - customer-centric approach
  async getCurrentSnapshotsForCampaign(campaignId: number): Promise<Array<{
    opportunityId: number;
    stage: string;
    year1Arr: number | null;
    tcv: number | null;
    snapshotDate: string;
    isOutdated?: boolean;
    outdatedNote?: string;
  }>> {
    // Get all campaign customers with opportunity details
    const allCampaignCustomers = await db
      .select({
        opportunityId: campaignCustomers.opportunityId,
        clientName: opportunities.clientName,
        opportunityName: opportunities.name,
        createdDate: opportunities.createdDate,
      })
      .from(campaignCustomers)
      .innerJoin(opportunities, eq(campaignCustomers.opportunityId, opportunities.id))
      .where(eq(campaignCustomers.campaignId, campaignId));

    if (allCampaignCustomers.length === 0) {
      return [];
    }

    // Group customers by normalized name
    const customerGroups = new Map<string, typeof allCampaignCustomers[0][]>();
    
    for (const customer of allCampaignCustomers) {
      const normalizedName = this.normalizeCustomerName(
        customer.clientName, 
        customer.opportunityName
      );
      
      if (!customerGroups.has(normalizedName)) {
        customerGroups.set(normalizedName, []);
      }
      customerGroups.get(normalizedName)!.push(customer);
    }

    const result: Array<{
      opportunityId: number;
      stage: string;
      year1Arr: number | null;
      tcv: number | null;
      snapshotDate: string;
      isOutdated?: boolean;
      outdatedNote?: string;
    }> = [];

    // For each customer group, find the opportunity with the latest close date
    for (const [customerName, customerOpportunities] of customerGroups) {
      // Get all opportunities for this customer (not just the ones in campaign)
      const allCustomerOpportunities = await db
        .select({
          id: opportunities.id,
          clientName: opportunities.clientName,
          name: opportunities.name,
        })
        .from(opportunities)
        .where(
          or(
            ...customerOpportunities.map(co => 
              or(
                sql`LOWER(${opportunities.clientName}) = LOWER(${co.clientName || co.opportunityName})`,
                sql`LOWER(${opportunities.name}) = LOWER(${co.clientName || co.opportunityName})`
              )
            )
          )
        );

      // Get all snapshots for all opportunities of this customer
      const allSnapshots = await db
        .select({
          opportunityId: snapshots.opportunityId,
          stage: snapshots.stage,
          year1Arr: snapshots.year1Value,
          tcv: snapshots.tcv,
          snapshotDate: snapshots.snapshotDate,
          closeDate: snapshots.expectedCloseDate,
        })
        .from(snapshots)
        .where(
          inArray(snapshots.opportunityId, allCustomerOpportunities.map(o => o.id))
        )
        .orderBy(desc(snapshots.snapshotDate), desc(snapshots.expectedCloseDate));

      if (allSnapshots.length === 0) continue;

      // Find the snapshot with the latest close date from the most recent snapshot date
      const latestSnapshotDate = allSnapshots[0].snapshotDate;
      const latestSnapshots = allSnapshots.filter(s => 
        s.snapshotDate.getTime() === latestSnapshotDate.getTime()
      );

      // Among the latest snapshots, find the one with the latest close date
      const bestSnapshot = latestSnapshots.reduce((best, current) => {
        const bestCloseDate = best.closeDate ? new Date(best.closeDate) : new Date(0);
        const currentCloseDate = current.closeDate ? new Date(current.closeDate) : new Date(0);
        return currentCloseDate > bestCloseDate ? current : best;
      });

      // Get the most recent snapshot date in the entire system for outdated check
      const [systemLatestSnapshot] = await db
        .select({ latestDate: sql<Date>`MAX(${snapshots.snapshotDate})` })
        .from(snapshots);
      
      const systemLatestDate = systemLatestSnapshot?.latestDate;
      const cutoffDays = 7;
      const cutoffDate = systemLatestDate ? new Date(systemLatestDate) : new Date();
      cutoffDate.setDate(cutoffDate.getDate() - cutoffDays);

      const isOutdated = bestSnapshot.snapshotDate < cutoffDate;
      
      result.push({
        opportunityId: bestSnapshot.opportunityId!,
        stage: isOutdated && bestSnapshot.stage !== 'Closed Lost' && bestSnapshot.stage !== 'Closed Won' 
          ? 'Closed Lost' 
          : bestSnapshot.stage || 'Unknown',
        year1Arr: bestSnapshot.year1Arr,
        tcv: bestSnapshot.tcv,
        snapshotDate: bestSnapshot.snapshotDate.toISOString(),
        isOutdated,
        outdatedNote: isOutdated ? `No data after ${bestSnapshot.snapshotDate.toISOString().split('T')[0]}` : undefined
      });
    }

    return result;

    // Get the most recent snapshot date in the entire system
    const [systemLatestSnapshot] = await db
      .select({ latestDate: sql<Date>`MAX(${snapshots.snapshotDate})` })
      .from(snapshots);
    
    const systemLatestDate = systemLatestSnapshot?.latestDate;
    if (!systemLatestDate) {
      return [];
    }

    // Get current snapshot data for all campaign customers
    const currentSnapshots = await db
      .select({
        opportunityId: snapshots.opportunityId,
        stage: snapshots.stage,
        year1Arr: snapshots.year1Value,
        tcv: snapshots.tcv,
        snapshotDate: snapshots.snapshotDate,
      })
      .from(snapshots)
      .where(
        and(
          inArray(snapshots.opportunityId, opportunityIds),
          // Get the most recent snapshot for each opportunity
          sql`${snapshots.snapshotDate} = (
            SELECT MAX(s2.snapshot_date) 
            FROM snapshots s2 
            WHERE s2.opportunity_id = ${snapshots.opportunityId}
          )`
        )
      );

    // Check for outdated snapshots and mark as Closed Lost if needed
    const cutoffDays = 7; // Consider snapshots older than 7 days from system latest as outdated
    const cutoffDate = new Date(systemLatestDate);
    cutoffDate.setDate(cutoffDate.getDate() - cutoffDays);

    return currentSnapshots
      .filter(snapshot => snapshot.opportunityId !== null)
      .map(snapshot => {
        const snapshotDate = snapshot.snapshotDate;
        const isOutdated = snapshotDate < cutoffDate;
        
        if (isOutdated && snapshot.stage !== 'Closed Lost' && snapshot.stage !== 'Closed Won') {
          // Mark as Closed Lost with note about outdated data
          const lastDataDate = snapshotDate.toISOString().split('T')[0];
          return {
            opportunityId: snapshot.opportunityId!,
            stage: 'Closed Lost',
            year1Arr: snapshot.year1Arr,
            tcv: snapshot.tcv,
            snapshotDate: snapshot.snapshotDate.toISOString(),
            isOutdated: true,
            outdatedNote: `No data after ${lastDataDate}`,
          };
        }
        
        return {
          opportunityId: snapshot.opportunityId!,
          stage: snapshot.stage || 'Unknown',
          year1Arr: snapshot.year1Arr,
          tcv: snapshot.tcv,
          snapshotDate: snapshot.snapshotDate.toISOString(),
          isOutdated: false,
        };
      });
  }

  // Get recent customers for campaign assignment
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
      // Get all snapshots ordered by date desc to find the most recent upload
      const allSnapshots = await db
        .select({
          opportunityId: opportunities.id,
          opportunityName: opportunities.name,
          clientName: opportunities.clientName,
          stage: snapshots.stage,
          year1Arr: snapshots.year1Value,
          tcv: snapshots.tcv,
          snapshotDate: snapshots.snapshotDate,
        })
        .from(opportunities)
        .innerJoin(snapshots, eq(opportunities.id, snapshots.opportunityId))
        .orderBy(desc(snapshots.snapshotDate));

      if (allSnapshots.length === 0) {
        return [];
      }

      // Get the most recent snapshot date
      const mostRecentDate = allSnapshots[0].snapshotDate;
      
      // Filter to only include snapshots from the most recent date
      const customersFromLatestUpload = allSnapshots.filter(row => {
        const rowDate = new Date(row.snapshotDate);
        const recentDate = new Date(mostRecentDate);
        return rowDate.getTime() === recentDate.getTime();
      });

      // Sort by opportunity name and return
      return customersFromLatestUpload
        .sort((a, b) => a.opportunityName.localeCompare(b.opportunityName))
        .map(row => ({
          opportunityId: row.opportunityId,
          opportunityName: row.opportunityName,
          clientName: row.clientName || undefined,
          stage: row.stage || undefined,
          year1Arr: row.year1Arr || undefined,
          tcv: row.tcv || undefined,
          latestSnapshotDate: row.snapshotDate.toISOString(),
        }));
    } catch (error) {
      console.error('Error fetching recent customers:', error);
      return [];
    }
  }

  // Settings - Campaign Types
  async getAllCampaignTypes(): Promise<Array<{ id: number; name: string; isActive: number }>> {
    return await db.select({
      id: campaignTypes.id,
      name: campaignTypes.name,
      isActive: campaignTypes.isActive,
    })
    .from(campaignTypes)
    .where(eq(campaignTypes.isActive, 1))
    .orderBy(asc(campaignTypes.name));
  }

  async createCampaignType(name: string): Promise<{ id: number; name: string; isActive: number }> {
    const [result] = await db.insert(campaignTypes)
      .values({ name, isActive: 1 })
      .returning();
    return result;
  }

  async updateCampaignType(id: number, name: string): Promise<void> {
    await db.update(campaignTypes)
      .set({ name })
      .where(eq(campaignTypes.id, id));
  }

  async deleteCampaignType(id: number): Promise<void> {
    await db.update(campaignTypes)
      .set({ isActive: 0 })
      .where(eq(campaignTypes.id, id));
  }

  // Settings - Influence Methods
  async getAllInfluenceMethods(): Promise<Array<{ id: number; name: string; isActive: number }>> {
    return await db.select({
      id: influenceMethods.id,
      name: influenceMethods.name,
      isActive: influenceMethods.isActive,
    })
    .from(influenceMethods)
    .where(eq(influenceMethods.isActive, 1))
    .orderBy(asc(influenceMethods.name));
  }

  async createInfluenceMethod(name: string): Promise<{ id: number; name: string; isActive: number }> {
    const [result] = await db.insert(influenceMethods)
      .values({ name, isActive: 1 })
      .returning();
    return result;
  }

  async updateInfluenceMethod(id: number, name: string): Promise<void> {
    await db.update(influenceMethods)
      .set({ name })
      .where(eq(influenceMethods.id, id));
  }

  async deleteInfluenceMethod(id: number): Promise<void> {
    await db.update(influenceMethods)
      .set({ isActive: 0 })
      .where(eq(influenceMethods.id, id));
  }
}

export const marketingStorage = new MarketingStorage();