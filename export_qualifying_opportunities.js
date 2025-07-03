import { marketingComparativeStorage } from './server/storage-mktg-comparative.js';

async function exportQualifyingOpportunities() {
  try {
    console.log('📋 Fetching campaign types data to get the correct 72 opportunities...');
    
    // First get the campaign types data to see which campaigns contribute to the 72
    const campaignTypesData = await fetch('http://localhost:5000/api/marketing/comparative/campaign-types?timePeriod=fy-to-date')
      .then(r => r.json())
      .catch(() => {
        console.log('API not available, using storage directly...');
        return null;
      });
    
    if (campaignTypesData) {
      console.log('📊 Campaign Type Summary (72 total):');
      campaignTypesData.forEach(type => {
        console.log(`- ${type.campaignType}: ${type.totalCustomers} opportunities`);
      });
      console.log(`\nTotal: ${campaignTypesData.reduce((sum, t) => sum + t.totalCustomers, 0)} customers engaged\n`);
    }

    // Get detailed opportunities 
    const opportunities = await marketingComparativeStorage.getDetailedQualifyingOpportunities();
    
    console.log(`📊 Found ${opportunities.length} opportunities from detailed function:`);
    console.log('═'.repeat(120));
    console.log('OPPORTUNITY DETAILS');
    console.log('═'.repeat(120));
    
    opportunities.forEach((opp, index) => {
      console.log(`${index + 1}. ${opp.name}`);
      console.log(`   ID: ${opp.opportunityIdString} (Internal: ${opp.opportunityId})`);
      console.log(`   Client: ${opp.clientName || 'N/A'}`);
      console.log(`   Stage: ${opp.stage}`);
      console.log(`   Value: $${opp.year1Value.toLocaleString()}`);
      console.log(`   Entered Pipeline: ${opp.enteredPipeline ? opp.enteredPipeline.toLocaleDateString() : 'N/A'}`);
      console.log(`   Close Date: ${opp.closeDate ? opp.closeDate.toLocaleDateString() : 'Open'}`);
      console.log(`   Snapshot Date: ${opp.snapshotDate.toLocaleDateString()}`);
      console.log(`   Campaign Type: ${opp.campaignType}`);
      console.log(`   First Campaign: ${new Date(opp.firstCampaignDate).toLocaleDateString()}`);
      console.log('─'.repeat(120));
    });
    
    // Summary by campaign type
    const typeSummary = {};
    let totalValue = 0;
    
    opportunities.forEach(opp => {
      const types = opp.campaignType.split(', ');
      types.forEach(type => {
        if (!typeSummary[type]) {
          typeSummary[type] = { count: 0, value: 0 };
        }
        // Only count each opportunity once (use first type for value)
        if (types[0] === type) {
          typeSummary[type].value += opp.year1Value;
          totalValue += opp.year1Value;
        }
        typeSummary[type].count++;
      });
    });
    
    console.log('\n📈 SUMMARY BY CAMPAIGN TYPE:');
    console.log('═'.repeat(80));
    Object.entries(typeSummary).forEach(([type, data]) => {
      console.log(`${type}: ${data.count} opportunities, $${data.value.toLocaleString()}`);
    });
    console.log('─'.repeat(80));
    console.log(`TOTAL: ${opportunities.length} opportunities, $${totalValue.toLocaleString()}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

exportQualifyingOpportunities();