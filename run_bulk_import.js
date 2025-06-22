// Direct bulk import execution script
import { marketingStorage } from './server/storage-mktg.js';

const customerNames = [
  "Azali Homes",
  "Bear Homes", 
  "Berks Homes",
  "Colbrides Homes",
  "Cambridge Homes",
  "Carter + Clark",
  "Cedarglen Homes",
  "Centrel Builders",
  "Choice Builders Group (Epcon)",
  "Classic-d Homes",
  "Cornerstone Development",
  "Couto Homes",
  "David Weekley Homes",
  "Dream Finders Homes",
  "DSLD Homes",
  "Eagle Construction of VA",
  "Eastbrook Homes",
  "Eastwood Homes",
  "EGStrickland",
  "Excel Homes",
  "Fischer Homes",
  "Front Light Building Company",
  "Gan Inc",
  "Green Brick Partners, Inc.",
  "GreenTech Homes",
  "Greenwood Homes",
  "Hayden Homes",
  "Home Development Inc (HDI)",
  "Homes By AV Homes",
  "Jagoe Homes",
  "JTB Homes",
  "K. Hovnanian Homes",
  "Kindred Homes",
  "Landmark24 Homes",
  "Lombardo Homes",
  "MH Homes (corporate office)",
  "Mainvue Homes",
  "Meadowbrook Builders",
  "Mungo Homes",
  "New Leaf Builders",
  "Northern Nevada Homes",
  "NVR, Inc.",
  "Old Town Design Group",
  "OLO Builders",
  "Pacific Lifestyle Homes",
  "Pathlight Homes",
  "Partners Development Group",
  "Perry Homes",
  "Pulte Group",
  "Revolution Homes",
  "Riverwood Homes - Arkansas",
  "Robert Thomas Builders",
  "Rockford Homes",
  "Schumacher Homes",
  "Scott Felder Homes LLC",
  "Shane Homes Group of Companies",
  "Shea Homes",
  "Signature Homes",
  "Skogman Homes",
  "The Color Group",
  "The Providence Group (Green Brick Partners)",
  "Thomas James Homes",
  "Toll Brothers, Inc.",
  "Tri Pointe Group",
  "Visionary Homes",
  "West Homes"
];

async function runImport() {
  console.log('🚀 Starting bulk import for campaign 2...');
  console.log(`📋 Processing ${customerNames.length} customers`);
  
  try {
    const targetDate = new Date('2025-02-27');
    const result = await marketingStorage.bulkImportCustomersToCampaign(2, customerNames, targetDate);
    
    console.log('\n=== BULK IMPORT RESULTS ===');
    console.log(`Total customers processed: ${customerNames.length}`);
    console.log(`✅ Successfully imported: ${result.successful.length}`);
    console.log(`❌ Failed to import: ${result.failed.length}`);
    
    if (result.successful.length > 0) {
      console.log('\n✅ SUCCESSFULLY IMPORTED:');
      result.successful.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} (Snapshot: ${item.snapshotDate})`);
      });
    }
    
    if (result.failed.length > 0) {
      console.log('\n❌ FAILED TO IMPORT:');
      result.failed.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} - ${item.reason}`);
      });
    }
    
    console.log('\n📊 SUMMARY:');
    console.log(`Import completed: ${result.successful.length} successes, ${result.failed.length} failures`);
    
    return result;
  } catch (error) {
    console.error('❌ Bulk import failed:', error);
    throw error;
  }
}

runImport();