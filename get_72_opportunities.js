import { db } from './shared/db.js';
import { campaigns, campaignCustomers, opportunities, snapshots } from './shared/schema.js';
import { and, gte, lte, inArray, eq, sql } from 'drizzle-orm';

async function get72QualifyingOpportunities() {
  try {
    console.log('📋 Getting the exact 72 qualifying opportunities using campaign type logic...\n');
    
    // Get fiscal year campaigns (same as campaign types calculation)
    const fiscalYearStart = new Date('2025-02-01');
    const fiscalYearEnd = new Date('2026-01-31');
    
    const allCampaigns = await db
      .select({
        id: campaigns.id,
        type: campaigns.type,
        name: campaigns.name,
        startDate: campaigns.startDate
      })
      .from(campaigns)
      .where(
        and(
          gte(campaigns.startDate, fiscalYearStart),
          lte(campaigns.startDate, fiscalYearEnd)
        )
      );

    console.log(`Found ${allCampaigns.length} fiscal year campaigns\n`);

    // Group campaigns by type
    const campaignsByType = {};
    allCampaigns.forEach(campaign => {
      if (!campaignsByType[campaign.type]) {
        campaignsByType[campaign.type] = [];
      }
      campaignsByType[campaign.type].push(campaign.id);
    });

    console.log('Campaign Types:');
    Object.entries(campaignsByType).forEach(([type, ids]) => {
      console.log(`- ${type}: ${ids.length} campaigns`);
    });
    console.log('');

    // Get qualifying opportunities for each campaign type
    const allQualifyingOpps = [];
    const seenOpportunityIds = new Set();

    for (const [campaignType, campaignIds] of Object.entries(campaignsByType)) {
      console.log(`🔍 Processing ${campaignType} campaigns...`);
      
      // Get opportunities associated with these campaigns
      const opportunityData = await db
        .select({
          opportunityId: campaignCustomers.opportunityId,
          opportunityIdString: opportunities.opportunityId,
          name: opportunities.name,
          clientName: opportunities.clientName,
          firstCampaignDate: sql`MIN(${campaigns.startDate})`.as('firstCampaignDate')
        })
        .from(campaignCustomers)
        .innerJoin(campaigns, eq(campaignCustomers.campaignId, campaigns.id))
        .innerJoin(opportunities, eq(campaignCustomers.opportunityId, opportunities.id))
        .where(inArray(campaignCustomers.campaignId, campaignIds))
        .groupBy(
          campaignCustomers.opportunityId, 
          opportunities.opportunityId, 
          opportunities.name, 
          opportunities.clientName
        );

      if (opportunityData.length === 0) continue;

      const opportunityIds = opportunityData.map(row => row.opportunityId);
      
      // Get most recent snapshots
      const recentSnapshots = await db
        .select({
          opportunityId: snapshots.opportunityId,
          enteredPipeline: snapshots.enteredPipeline,
          closeDate: snapshots.closeDate,
          stage: snapshots.stage,
          year1Value: snapshots.year1Value,
          snapshotDate: snapshots.snapshotDate
        })
        .from(snapshots)
        .where(
          and(
            inArray(snapshots.opportunityId, opportunityIds),
            sql`(${snapshots.opportunityId}, ${snapshots.snapshotDate}) IN (
              SELECT ${snapshots.opportunityId}, MAX(${snapshots.snapshotDate})
              FROM ${snapshots}
              WHERE ${inArray(snapshots.opportunityId, opportunityIds)}
              GROUP BY ${snapshots.opportunityId}
            )`
          )
        );

      // Apply 3-step filtering
      const opportunityDateMap = new Map(
        opportunityData.map(row => [row.opportunityId, { 
          firstCampaignDate: row.firstCampaignDate,
          opportunityIdString: row.opportunityIdString,
          name: row.name,
          clientName: row.clientName
        }])
      );

      let qualifyingForType = 0;
      for (const snapshot of recentSnapshots) {
        const oppData = opportunityDateMap.get(snapshot.opportunityId);
        if (!oppData) continue;

        // Step 1: Already filtered (opportunity associated with campaign)
        // Step 2: Has entered_pipeline date
        if (!snapshot.enteredPipeline) continue;
        
        // Step 3: Close date > first campaign date (or no close date = still open)
        if (snapshot.closeDate && snapshot.closeDate <= oppData.firstCampaignDate) continue;

        qualifyingForType++;
        
        // Only add to detailed list if we haven't seen this opportunity yet
        if (!seenOpportunityIds.has(snapshot.opportunityId)) {
          seenOpportunityIds.add(snapshot.opportunityId);
          allQualifyingOpps.push({
            opportunityId: snapshot.opportunityId,
            opportunityIdString: oppData.opportunityIdString,
            name: oppData.name,
            clientName: oppData.clientName,
            stage: snapshot.stage,
            year1Value: snapshot.year1Value || 0,
            enteredPipeline: snapshot.enteredPipeline,
            closeDate: snapshot.closeDate,
            snapshotDate: snapshot.snapshotDate,
            campaignType: campaignType,
            firstCampaignDate: oppData.firstCampaignDate
          });
        }
      }
      
      console.log(`   ✅ ${qualifyingForType} qualifying opportunities for ${campaignType}`);
    }

    console.log(`\n📊 TOTAL UNIQUE QUALIFYING OPPORTUNITIES: ${allQualifyingOpps.length}\n`);
    console.log('═'.repeat(120));
    console.log('DETAILED LIST OF 72 QUALIFYING OPPORTUNITIES');
    console.log('═'.repeat(120));

    // Sort by campaign type, then by name
    allQualifyingOpps.sort((a, b) => {
      if (a.campaignType !== b.campaignType) {
        return a.campaignType.localeCompare(b.campaignType);
      }
      return a.name.localeCompare(b.name);
    });

    allQualifyingOpps.forEach((opp, index) => {
      console.log(`${index + 1}. ${opp.name}`);
      console.log(`   ID: ${opp.opportunityIdString} (Internal: ${opp.opportunityId})`);
      console.log(`   Client: ${opp.clientName || 'N/A'}`);
      console.log(`   Stage: ${opp.stage}`);
      console.log(`   Value: $${opp.year1Value.toLocaleString()}`);
      console.log(`   Entered Pipeline: ${opp.enteredPipeline.toLocaleDateString()}`);
      console.log(`   Close Date: ${opp.closeDate ? opp.closeDate.toLocaleDateString() : 'Open'}`);
      console.log(`   Snapshot Date: ${opp.snapshotDate.toLocaleDateString()}`);
      console.log(`   Campaign Type: ${opp.campaignType}`);
      console.log(`   First Campaign: ${new Date(opp.firstCampaignDate).toLocaleDateString()}`);
      console.log('─'.repeat(120));
    });

    // Summary
    const typeSummary = {};
    let totalValue = 0;
    
    allQualifyingOpps.forEach(opp => {
      if (!typeSummary[opp.campaignType]) {
        typeSummary[opp.campaignType] = { count: 0, value: 0 };
      }
      typeSummary[opp.campaignType].count++;
      typeSummary[opp.campaignType].value += opp.year1Value;
      totalValue += opp.year1Value;
    });
    
    console.log('\n📈 SUMMARY BY CAMPAIGN TYPE:');
    console.log('═'.repeat(80));
    Object.entries(typeSummary).forEach(([type, data]) => {
      console.log(`${type}: ${data.count} opportunities, $${data.value.toLocaleString()}`);
    });
    console.log('─'.repeat(80));
    console.log(`TOTAL: ${allQualifyingOpps.length} opportunities, $${totalValue.toLocaleString()}`);

    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

get72QualifyingOpportunities();