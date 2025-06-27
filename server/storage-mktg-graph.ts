import { db } from './db';
import { campaigns, campaignCustomers, opportunities, snapshots } from '../shared/schema';
import { eq, and, gte, lte, sql, desc, asc } from 'drizzle-orm';

export class MarketingGraphStorage {
  
  /**
   * Get pipeline value over time for a campaign
   * Returns weekly pipeline and closed won values from campaign start date to today
   */
  async getCampaignPipelineWalk(campaignId: number): Promise<Array<{
    date: string;
    pipelineValue: number;
    closedWonValue: number;
    customerCount: number;
  }>> {
    try {
      console.log('📊 Getting pipeline walk data for campaign:', campaignId);

      // Get campaign details
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, campaignId));

      if (!campaign) {
        console.log('❌ Campaign not found:', campaignId);
        return [];
      }

      const startDate = new Date(campaign.startDate);
      const today = new Date();
      
      console.log('📅 Campaign date range:', startDate.toISOString().split('T')[0], 'to', today.toISOString().split('T')[0]);

      // Get campaign customers with their starting snapshot data
      const campaignCustomerData = await db
        .select({
          opportunityId: campaignCustomers.opportunityId,
          snapshotDate: campaignCustomers.snapshotDate,
          startingStage: campaignCustomers.stage,
          startingYear1Arr: campaignCustomers.year1Arr,
          createdAt: campaignCustomers.createdAt,
          opportunityName: opportunities.name,
          clientName: opportunities.clientName
        })
        .from(campaignCustomers)
        .innerJoin(opportunities, eq(campaignCustomers.opportunityId, opportunities.id))
        .where(eq(campaignCustomers.campaignId, campaignId));

      if (campaignCustomerData.length === 0) {
        console.log('📊 No customers found for campaign:', campaignId);
        return [];
      }

      // Get all snapshots for these opportunities within date range
      const opportunityIds = campaignCustomerData.map(c => c.opportunityId);
      
      const snapshotData = await db
        .select({
          opportunityId: snapshots.opportunityId,
          snapshotDate: snapshots.snapshotDate,
          stage: snapshots.stage,
          year1Arr: snapshots.year1Value,
          enteredPipeline: snapshots.enteredPipeline
        })
        .from(snapshots)
        .where(
          and(
            sql`${snapshots.opportunityId} = ANY(${sql.raw(`ARRAY[${opportunityIds.join(',')}]`)})`,
            gte(snapshots.snapshotDate, startDate),
            lte(snapshots.snapshotDate, today)
          )
        )
        .orderBy(snapshots.snapshotDate, snapshots.opportunityId);

      console.log('📊 Found snapshots:', snapshotData.length);

      // Create regular weekly intervals from campaign start to today
      const pipelineData: Array<{
        date: string;
        pipelineValue: number;
        closedWonValue: number;
        customerCount: number;
      }> = [];

      // First, determine which customers have entered pipeline and get their entered pipeline dates
      const customersPipelineInfo = new Map<number, { hasEnteredPipeline: boolean; enteredDate: Date | null }>();
      
      campaignCustomerData.forEach(customer => {
        // Get the most recent snapshot for this customer overall (not date-limited)
        const allCustomerSnapshots = snapshotData
          .filter(s => s.opportunityId === customer.opportunityId)
          .sort((a, b) => new Date(b.snapshotDate!).getTime() - new Date(a.snapshotDate!).getTime());
        
        const mostRecentSnapshot = allCustomerSnapshots[0];
        const hasEnteredPipeline = !!mostRecentSnapshot?.enteredPipeline;
        const enteredDate = mostRecentSnapshot?.enteredPipeline ? new Date(mostRecentSnapshot.enteredPipeline) : null;
        
        // Debug logging for Vantage specifically
        if (customer.opportunityName === 'Vantage Homes') {
          console.log('🔍 VANTAGE DEBUG - Customer Info:', {
            opportunityId: customer.opportunityId,
            opportunityName: customer.opportunityName,
            startingStage: customer.startingStage,
            startingValue: customer.startingYear1Arr,
            snapshotsFound: allCustomerSnapshots.length,
            hasEnteredPipeline,
            enteredDate: enteredDate?.toISOString(),
            mostRecentSnapshot: mostRecentSnapshot ? {
              stage: mostRecentSnapshot.stage,
              value: mostRecentSnapshot.year1Arr,
              snapshotDate: mostRecentSnapshot.snapshotDate
            } : null
          });
        }
        
        customersPipelineInfo.set(customer.opportunityId, { hasEnteredPipeline, enteredDate });
      });

      const currentDate = new Date(startDate);
      
      while (currentDate <= today) {
        const dateStr = currentDate.toISOString().split('T')[0];
        let pipelineValue = 0;
        let closedWonValue = 0;
        let customerCount = 0;

        campaignCustomerData.forEach(customer => {
          // Only include customers who have entered pipeline
          const pipelineInfo = customersPipelineInfo.get(customer.opportunityId);
          
          if (pipelineInfo?.hasEnteredPipeline && pipelineInfo.enteredDate) {
            // Only include this customer if current date is after their entered pipeline date
            if (currentDate >= pipelineInfo.enteredDate) {
              // Get most recent snapshot for this opportunity up to current date
              const relevantSnapshots = snapshotData
                .filter(s => s.opportunityId === customer.opportunityId && 
                            s.snapshotDate && s.snapshotDate <= currentDate)
                .sort((a, b) => new Date(b.snapshotDate!).getTime() - new Date(a.snapshotDate!).getTime());

              const mostRecentSnapshot = relevantSnapshots[0];
              const currentStage = mostRecentSnapshot?.stage || customer.startingStage;
              const currentValue = mostRecentSnapshot?.year1Arr || customer.startingYear1Arr || 0;
              
              // Debug logging for Vantage on specific dates
              if (customer.opportunityName === 'Vantage Homes' && 
                  (dateStr === '2025-06-23' || dateStr === '2025-06-24' || dateStr === '2025-06-26' || dateStr === '2025-06-27')) {
                console.log(`🔍 VANTAGE DEBUG - Date ${dateStr}:`, {
                  currentDate: currentDate.toISOString(),
                  enteredPipelineDate: pipelineInfo.enteredDate?.toISOString(),
                  relevantSnapshotsCount: relevantSnapshots.length,
                  mostRecentSnapshot: mostRecentSnapshot ? {
                    stage: mostRecentSnapshot.stage,
                    value: mostRecentSnapshot.year1Arr,
                    snapshotDate: mostRecentSnapshot.snapshotDate
                  } : null,
                  currentStage,
                  currentValue,
                  startingStage: customer.startingStage,
                  willInclude: customer.startingStage !== 'Closed Won',
                  stageCategory: currentStage?.includes('Closed Won') ? 'closedWon' : 
                                currentStage?.includes('Closed Lost') ? 'closedLost' : 'pipeline'
                });
              }
              
              // Exclude pre-existing "Closed Won" customers for accurate attribution
              if (customer.startingStage !== 'Closed Won') {
                customerCount++;
                
                if (currentStage && currentStage.includes('Closed Won')) {
                  closedWonValue += currentValue;
                } else if (currentStage && !currentStage.includes('Closed Lost')) {
                  pipelineValue += currentValue;
                }
              }
            }
          }
        });

        pipelineData.push({
          date: dateStr,
          pipelineValue,
          closedWonValue,
          customerCount
        });

        // Move to next week
        currentDate.setDate(currentDate.getDate() + 7);
      }

      // Add one final data point for "today" if it's not already included
      const lastDataPoint = pipelineData[pipelineData.length - 1];
      const lastDataDate = new Date(lastDataPoint.date);
      const daysDifference = Math.ceil((today.getTime() - lastDataDate.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log('📊 Final data point check:', {
        lastDataDate: lastDataDate.toISOString().split('T')[0],
        today: today.toISOString().split('T')[0],
        daysDifference,
        willAddFinalPoint: daysDifference > 1
      });
      
      if (daysDifference > 1) { // If more than 1 day since last data point, add current state
        const todayStr = today.toISOString().split('T')[0];
        let pipelineValue = 0;
        let closedWonValue = 0;
        let customerCount = 0;

        campaignCustomerData.forEach(customer => {
          const pipelineInfo = customersPipelineInfo.get(customer.opportunityId);
          
          if (pipelineInfo?.hasEnteredPipeline && pipelineInfo.enteredDate) {
            if (today >= pipelineInfo.enteredDate) {
              const relevantSnapshots = snapshotData
                .filter(s => s.opportunityId === customer.opportunityId && 
                            s.snapshotDate && s.snapshotDate <= today)
                .sort((a, b) => new Date(b.snapshotDate!).getTime() - new Date(a.snapshotDate!).getTime());

              const mostRecentSnapshot = relevantSnapshots[0];
              const currentStage = mostRecentSnapshot?.stage || customer.startingStage;
              const currentValue = mostRecentSnapshot?.year1Arr || customer.startingYear1Arr || 0;
              
              if (customer.startingStage !== 'Closed Won') {
                customerCount++;
                
                if (currentStage && currentStage.includes('Closed Won')) {
                  closedWonValue += currentValue;
                } else if (currentStage && !currentStage.includes('Closed Lost')) {
                  pipelineValue += currentValue;
                }
              }
            }
          }
        });

        pipelineData.push({
          date: todayStr,
          pipelineValue,
          closedWonValue,
          customerCount
        });
        
        console.log('📊 Added final data point for today:', todayStr, { pipelineValue, closedWonValue, customerCount });
      }

      console.log('📊 Generated pipeline walk data points:', pipelineData.length);
      return pipelineData;

    } catch (error) {
      console.error('❌ Error getting campaign pipeline walk:', error);
      return [];
    }
  }

  /**
   * Get stage flow data for Sankey chart
   * Returns stage transitions for campaign customers
   */
  async getCampaignStageFlow(campaignId: number): Promise<{
    nodes: Array<{ id: string; name: string; category: string }>;
    links: Array<{ source: string; target: string; value: number; customers: Array<{ name: string; dateMoved: Date }>; pipelineValue: number }>;
  }> {
    try {
      console.log('📊 Getting stage flow data for campaign:', campaignId);

      // Get campaign customers with opportunity data
      const campaignCustomerData = await db
        .select({
          opportunityId: campaignCustomers.opportunityId,
          startingStage: campaignCustomers.stage,
          opportunityName: opportunities.name,
          clientName: opportunities.clientName
        })
        .from(campaignCustomers)
        .innerJoin(opportunities, eq(campaignCustomers.opportunityId, opportunities.id))
        .where(eq(campaignCustomers.campaignId, campaignId));

      if (campaignCustomerData.length === 0) {
        return { nodes: [], links: [] };
      }

      // Get all snapshots for these opportunities, ordered by date
      const opportunityIds = campaignCustomerData.map(c => c.opportunityId);
      
      const snapshotData = await db
        .select({
          opportunityId: snapshots.opportunityId,
          snapshotDate: snapshots.snapshotDate,
          stage: snapshots.stage,
          year1Arr: snapshots.year1Value
        })
        .from(snapshots)
        .where(sql`${snapshots.opportunityId} = ANY(${sql.raw(`ARRAY[${opportunityIds.join(',')}]`)})`)
        .orderBy(snapshots.opportunityId, snapshots.snapshotDate);

      console.log('📊 Found snapshots for stage flow:', snapshotData.length);
      console.log('📊 Sample snapshots:', snapshotData.slice(0, 3));

      // Group snapshots by opportunity and track stage transitions
      const stageTransitions = new Map<string, { value: number; customers: Map<string, Date>; pipelineValue: number }>();
      const stageNodes = new Set<string>();

      // Process each opportunity's stage progression
      const opportunitySnapshots = new Map<number, Array<typeof snapshotData[0]>>();
      snapshotData.forEach(snapshot => {
        if (snapshot.opportunityId) {
          if (!opportunitySnapshots.has(snapshot.opportunityId)) {
            opportunitySnapshots.set(snapshot.opportunityId, []);
          }
          opportunitySnapshots.get(snapshot.opportunityId)!.push(snapshot);
        }
      });

      console.log('📊 Campaign customers for stage flow:', campaignCustomerData.length);
      console.log('📊 Sample campaign customer:', campaignCustomerData[0]);

      let totalTransitionsFound = 0;
      
      campaignCustomerData.forEach((customer, index) => {
        const snapshots = opportunitySnapshots.get(customer.opportunityId) || [];
        
        if (index < 2) {
          console.log(`📊 Processing customer ${index + 1}: ${customer.clientName || customer.opportunityName} (${customer.startingStage})`);
          console.log(`📊 Customer has ${snapshots.length} snapshots`);
        }
        
        // Only process customers not pre-existing "Closed Won"
        if (customer.startingStage === 'Closed Won') {
          if (index < 2) console.log(`📊 Skipping pre-existing Closed Won customer`);
          return;
        }

        // Add starting stage as a node
        if (customer.startingStage) {
          stageNodes.add(customer.startingStage);
        }

        let previousStage = customer.startingStage;
        const customerName = customer.clientName || customer.opportunityName;

        snapshots.forEach((snapshot, snapIndex) => {
          const currentStage = snapshot.stage;
          if (currentStage) {
            stageNodes.add(currentStage);

            // If stage changed, record the transition (avoid circular/self-referencing links)
            if (currentStage && previousStage && currentStage !== previousStage) {
              const transitionKey = `${previousStage} → ${currentStage}`;
              
              if (index < 2) {
                console.log(`📊 Found transition: ${transitionKey} for ${customerName} on ${snapshot.snapshotDate}`);
              }
              
              if (!stageTransitions.has(transitionKey)) {
                stageTransitions.set(transitionKey, { 
                  value: 0, 
                  customers: new Map(), // Change to Map to store customer with date
                  pipelineValue: 0
                });
              }
              
              const transition = stageTransitions.get(transitionKey)!;
              // Use customer count instead of dollar value
              if (customerName) {
                transition.customers.set(customerName, snapshot.snapshotDate);
                transition.value = transition.customers.size;
                // Add pipeline value for upward stage movements
                transition.pipelineValue += snapshot.year1Arr || 0;
                totalTransitionsFound++;
              }
              
              previousStage = currentStage;
            }
          }
        });
      });

      console.log(`📊 Total stage transitions found: ${totalTransitionsFound}`);
      console.log(`📊 Unique stage nodes: ${Array.from(stageNodes)}`);
      console.log(`📊 Stage transitions map size: ${stageTransitions.size}`);

      // Create nodes array
      const nodes = Array.from(stageNodes).map(stage => ({
        id: stage,
        name: stage,
        category: this.getStageCategory(stage)
      }));

      // Create links array and filter out any potential circular references
      const links = Array.from(stageTransitions.entries())
        .map(([transition, data]) => {
          const [source, target] = transition.split(' → ');
          return {
            source,
            target,
            value: data.value,
            customers: Array.from(data.customers.entries()).map(([name, date]) => ({
              name,
              dateMoved: date
            })),
            pipelineValue: data.pipelineValue
          };
        })
        .filter(link => link.source !== link.target); // Ensure no self-referencing links

      console.log('📊 Stage flow - Nodes:', nodes.length, 'Links:', links.length);
      return { nodes, links };

    } catch (error) {
      console.error('❌ Error getting campaign stage flow:', error);
      return { nodes: [], links: [] };
    }
  }

  /**
   * Get stage category for coloring
   */
  private getStageCategory(stage: string): string {
    if (!stage) return 'other';
    if (stage.includes('Closed Won')) return 'won';
    if (stage.includes('Closed Lost')) return 'lost';
    if (stage.includes('Discover')) return 'early';
    if (stage.includes('Developing')) return 'middle';
    if (stage.includes('ROI') || stage.includes('Negotiation')) return 'late';
    if (stage.includes('Validation')) return 'other';
    return 'other';
  }


}

export const marketingGraphStorage = new MarketingGraphStorage();