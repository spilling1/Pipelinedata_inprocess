// Bulk import script to run via browser console
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

async function runBulkImport() {
  try {
    const response = await fetch('/api/marketing/campaigns/2/customers/bulk-import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        customerNames: customerNames,
        targetDate: '2025-02-27'
      })
    });
    
    const result = await response.json();
    console.log('Bulk import result:', result);
    
    console.log(`Successfully imported: ${result.successful?.length || 0} customers`);
    console.log(`Failed to import: ${result.failed?.length || 0} customers`);
    
    if (result.failed && result.failed.length > 0) {
      console.log('Failed customers:', result.failed);
    }
    
    return result;
  } catch (error) {
    console.error('Error running bulk import:', error);
  }
}

// Run the import
runBulkImport();