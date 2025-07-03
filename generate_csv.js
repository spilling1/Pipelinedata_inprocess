import { db } from './shared/db.js';
import { campaigns, campaignCustomers, opportunities, snapshots } from './shared/schema.js';
import { and, gte, lte, inArray, eq, sql } from 'drizzle-orm';
import { writeFileSync } from 'fs';

async function generateCSV() {
  try {
    console.log('📋 Generating CSV of 72 qualifying opportunities...');
    
    // Get fiscal year campaigns
    const fiscalYearStart = new Date('2025-02-01');
    const fiscalYearEnd = new Date('2026-01-31');
    
    const allCampaigns = await db
      .select({
        id: campaigns.id,
        type: campaigns.type
      })
      .from(campaigns)
      .where(
        and(
          gte(campaigns.startDate, fiscalYearStart),
          lte(campaigns.startDate, fiscalYearEnd)
        )
      );

    // Group campaigns by type
    const campaignsByType = {};
    allCampaigns.forEach(campaign => {
      if (!campaignsByType[campaign.type]) {
        campaignsByType[campaign.type] = [];
      }
      campaignsByType[campaign.type].push(campaign.id);
    });

    // Get qualifying opportunities for each campaign type
    const allQualifyingOpps = [];
    const seenOpportunityIds = new Set();

    for (const [campaignType, campaignIds] of Object.entries(campaignsByType)) {
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

      // Apply 3-step filtering and collect unique opportunities
      const opportunityDateMap = new Map(
        opportunityData.map(row => [row.opportunityId, { 
          firstCampaignDate: row.firstCampaignDate,
          opportunityIdString: row.opportunityIdString,
          name: row.name,
          clientName: row.clientName
        }])
      );

      for (const snapshot of recentSnapshots) {
        const oppData = opportunityDateMap.get(snapshot.opportunityId);
        if (!oppData) continue;

        // Step 1: Already filtered (opportunity associated with campaign)
        // Step 2: Has entered_pipeline date
        if (!snapshot.enteredPipeline) continue;
        
        // Step 3: Close date > first campaign date (or no close date = still open)
        if (snapshot.closeDate && snapshot.closeDate <= oppData.firstCampaignDate) continue;

        // Only add if we haven't seen this opportunity yet (avoid duplicates across campaign types)
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
    }

    // Sort by name
    allQualifyingOpps.sort((a, b) => a.name.localeCompare(b.name));

    // Create CSV content
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

    const csvRows = [
      headers.join(','),
      ...allQualifyingOpps.map(opp => [
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
    
    // Write to file
    writeFileSync('qualifying_opportunities_72.csv', csvContent);
    
    console.log(`✅ Generated CSV file with ${allQualifyingOpps.length} qualifying opportunities`);
    console.log('📄 File saved as: qualifying_opportunities_72.csv');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

generateCSV();