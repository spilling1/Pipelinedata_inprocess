// Bulk import script for 2024 IBS Event Campaign
// Campaign ID: 19 | Start Date: 2024-02-27

const customerNames = [
  "Abrazo Homes",
  "Rausch Coleman Homes", 
  "Brightland Homes [HQ]",
  "Grand Homes",
  "Beechwood Homes",
  "Mattamy Homes",
  "AR Homes by Arthur Rutenberg",
  "Milestone Community Builders",
  "Ideal Homes",
  "Landsea Homes",
  "Dream Finders Homes",
  "United Built Homes",
  "New Home Inc.",
  "Bishard Development Corp",
  "Holiday Builders",
  "Simply Home by Camillo",
  "Pulte Group",
  "Epcon Corporate Communities",
  "Tim O'Brien Homes",
  "Adair Homes",
  "DSLD Homes",
  "Brown Haven Homes",
  "Visionary Homes",
  "Meritage Homes",
  "AR Homes Franchising",
  "Lexar Homes",
  "Keystone Custom Home",
  "Berks Homes",
  "Eastbrook Homes",
  "Lowder New Homes",
  "Marrano Homes - Marc Equity Corp",
  "A+ Construction & Remodeling",
  "Wayne Homes",
  "Olthof Homes",
  "Corinth Residential",
  "De Young Properties",
  "LevelTX Corp",
  "Flagship Homes (UT)",
  "First Texas Homes",
  "Pyatt Builders [ACQUIRED]",
  "Schumacher Homes",
  "Buffington Homes of Arkansas",
  "Pacific Lifestyle Homes",
  "Hamlet Homes",
  "Drees Homes",
  "Havyn Homes",
  "MonteVista Homes",
  "Nilson Homes",
  "Ashlar Homes",
  "Kartchner Homes",
  "Landmark24 Homes",
  "Sage Homes Iowa",
  "JTB Homes",
  "Challenger Homes",
  "Signature Homes",
  "Sunrise Homes",
  "James Monroe Homes",
  "Windsong Properties",
  "McKee Homes",
  "Fieldstone Homes",
  "Fischer Homes",
  "Coastal Affaire (Tracewater)",
  "Paran Homes",
  "Rock Creek Homes",
  "Panther Builders",
  "Integrity Homes",
  "Douglas Homes",
  "David Weekley Homes",
  "Home Development Inc (HDI)",
  "Newmark Homes",
  "Shea Homes",
  "Arthur Rutenberg Homes",
  "McKee Builders",
  "Great Gulf",
  "JP Brooks Builders",
  "Mungo Homes",
  "Hayden Homes",
  "New Leaf Builders",
  "Central Builders",
  "Schuber Mitchell Homes",
  "McBride Homes",
  "Architerra Homes",
  "Cornerstone Development"
];

async function executeBulkImport() {
  console.log('🚀 Starting bulk import for 2024 IBS Event Campaign...');
  console.log(`📋 Processing ${customerNames.length} customers`);
  console.log('🎯 Campaign ID: 19 | Target Date: 2024-02-27');
  
  try {
    const response = await fetch('/api/marketing/campaigns/19/customers/bulk-import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        customerNames: customerNames,
        targetDate: '2024-02-27'
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    console.log('\n=== 2024 IBS BULK IMPORT RESULTS ===');
    console.log(`Total customers processed: ${customerNames.length}`);
    console.log(`✅ Successfully imported: ${result.successful?.length || 0}`);
    console.log(`❌ Failed to import: ${result.failed?.length || 0}`);
    
    if (result.successful?.length > 0) {
      console.log('\n✅ SUCCESSFULLY IMPORTED:');
      result.successful.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} (Snapshot: ${item.snapshotDate})`);
      });
    }
    
    if (result.failed?.length > 0) {
      console.log('\n❌ FAILED TO IMPORT:');
      result.failed.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} - ${item.reason}`);
      });
    }
    
    console.log('\n📊 SUMMARY:');
    console.log(`Import completed: ${result.successful?.length || 0} successes, ${result.failed?.length || 0} failures`);
    console.log(`Success rate: ${((result.successful?.length || 0) / customerNames.length * 100).toFixed(1)}%`);
    
    return result;
  } catch (error) {
    console.error('❌ Bulk import failed:', error);
    throw error;
  }
}

// Execute the import
console.log('🎪 2024 IBS Event - Bulk Customer Import');
console.log('==========================================');
executeBulkImport()
  .then((result) => {
    console.log('\n✅ Bulk import process completed successfully!');
  })
  .catch((error) => {
    console.error('\n💥 Bulk import process failed:', error.message);
  });