import { extractDateFromFilename, normalizeHeader, parseCSVLine } from "./fileUtils";
import { normalizeStage } from "./excelUtils";

// Helper function to parse CSV data
export async function parseCSVData(buffer: Buffer, filename: string) {
  console.log(`🗂️ Parsing CSV file: ${filename}`);
  const csvText = buffer.toString('utf-8');
  const lines = csvText.split('\n').filter(line => line.trim().length > 0);
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  const snapshotDate = extractDateFromFilename(filename);
  console.log(`📅 Extracted snapshot date: ${snapshotDate}`);
  
  if (!snapshotDate) {
    throw new Error('Could not extract date from filename. Expected format with timestamp: Open Pipeline - Finance-YYYY-MM-DD-HH-MM-SS.csv');
  }

  // Parse CSV header
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);
  console.log(`📊 CSV Headers found: ${headers.slice(0, 10).join(', ')}... (${headers.length} total)`);
  console.log(`📊 All CSV Headers:`, headers);
  
  // Parse CSV data
  const rawData: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = parseCSVLine(line);
    
    // Create row object
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || null;
    });
    rawData.push(row);
  }
  
  console.log(`📊 Parsed ${rawData.length} rows from CSV`);
  if (rawData.length > 0) {
    console.log(`📋 Sample first row keys: ${Object.keys(rawData[0]).slice(0, 5).join(', ')}...`);
    console.log(`📋 Sample first row values:`, Object.values(rawData[0]).slice(0, 5));
  }

  if (rawData.length === 0) {
    throw new Error('No data found in CSV file');
  }

  const processedData = [];
  
  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    const normalizedRow: any = {};
    
    // Normalize all headers
    for (const [key, value] of Object.entries(row)) {
      const normalizedKey = normalizeHeader(key);
      normalizedRow[normalizedKey] = value;
    }

    // Debug logging for first few rows
    if (i < 3) {
      console.log(`🔍 Row ${i + 1} original keys:`, Object.keys(row).slice(0, 5));
      console.log(`🔍 Row ${i + 1} normalized keys:`, Object.keys(normalizedRow).slice(0, 5));
      console.log(`🔍 Row ${i + 1} name fields:`, {
        opportunity_name: normalizedRow.opportunity_name,
        deal_name: normalizedRow.deal_name, 
        name: normalizedRow.name
      });
    }

    // Skip empty rows
    if (!normalizedRow.opportunity_name && !normalizedRow.deal_name && !normalizedRow.name) {
      if (i < 5) console.log(`⏭️ Skipping row ${i + 1} (no opportunity name found)`);
      continue;
    }

    // Map common field variations (same logic as Excel parsing)
    const opportunityId = normalizedRow.opportunity_id || 
                          normalizedRow.id || 
                          normalizedRow.opp_id ||
                          normalizedRow.deal_id ||
                          'Unknown ID';
    
    const opportunityName = normalizedRow.opportunity_name || 
                            normalizedRow.deal_name || 
                            normalizedRow.name ||
                            normalizedRow.account_name ||
                            'Unknown Opportunity';
    
    const tcv = normalizedRow.tcv ||
                normalizedRow.total_contract_value ||
                0;

    const expectedRevenue = normalizedRow.expected_revenue ||
                            normalizedRow.revenue ||
                            normalizedRow.amount ||
                            normalizedRow.value ||
                            normalizedRow.deal_value ||
                            normalizedRow.opportunity_value ||
                            tcv ||
                            0;

    const stage = await normalizeStage(normalizedRow.stage || 
                                       normalizedRow.sales_stage || 
                                       normalizedRow.deal_stage || 
                                       normalizedRow.pipeline_stage || 
                                       'Unknown');

    const owner = normalizedRow.owner || 
                  normalizedRow.account_owner || 
                  normalizedRow.sales_rep || 
                  normalizedRow.assigned_to ||
                  'Unknown';

    const clientName = normalizedRow.client_name || 
                       normalizedRow.account_name || 
                       normalizedRow.company || 
                       normalizedRow.customer ||
                       'Unknown Client';

    const closeDate = normalizedRow.close_date || 
                      normalizedRow.expected_close_date || 
                      normalizedRow.target_close_date ||
                      null;

    const enteredPipeline = normalizedRow.entered_pipeline || 
                            normalizedRow.created_date || 
                            normalizedRow.pipeline_entry_date ||
                            null;

    const lossReason = normalizedRow.loss_reason || 
                       normalizedRow.reason_lost || 
                       normalizedRow.lost_reason ||
                       null;

    const probability = normalizedRow.probability || 
                        normalizedRow.win_probability || 
                        normalizedRow.close_probability ||
                        null;

    // Parse date function for CSV
    const parseDate = (dateStr: any): Date | null => {
      if (!dateStr) return null;
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    };

    processedData.push({
      opportunityId: String(opportunityId),
      opportunityName: String(opportunityName),
      clientName: String(clientName),
      owner: String(owner),
      createdDate: parseDate(normalizedRow.created_date || normalizedRow.date_created),
      stage,
      confidence: normalizedRow.confidence || '',
      opportunityType: normalizedRow.opportunity_type || normalizedRow.type || null,
      amount: parseFloat(String(expectedRevenue).replace(/[,$]/g, '')) || 0,
      tcv: parseFloat(String(tcv).replace(/[,$]/g, '')) || 0,
      expectedCloseDate: parseDate(closeDate),
      closeDate: parseDate(closeDate),
      billingStartDate: parseDate(normalizedRow.billing_start_date || normalizedRow.billing_start),
      solutionsOffered: normalizedRow.solutions_offered || normalizedRow.solutions || null,
      icp: normalizedRow.icp || normalizedRow.ideal_customer_profile || null,
      numberOfContacts: normalizedRow.number_of_contacts ? parseInt(normalizedRow.number_of_contacts) || null : null,
      blendedwAverageTitle: normalizedRow.blended_average_title || normalizedRow.avg_title || null,
      year1Value: parseFloat(String(expectedRevenue).replace(/[,$]/g, '')) || 0,
      year2Value: parseFloat(String(normalizedRow.year2_value || 0).replace(/[,$]/g, '')) || 0,
      year3Value: parseFloat(String(normalizedRow.year3_value || 0).replace(/[,$]/g, '')) || 0,
      erpSystemInUse: normalizedRow.erp_system_in_use || normalizedRow.erp_system || null,
      age: normalizedRow.age ? parseInt(normalizedRow.age) || null : null,
      stageDuration: normalizedRow.stage_duration ? parseInt(normalizedRow.stage_duration) || null : null,
      stageBefore: normalizedRow.stage_before || normalizedRow.previous_stage || null,
      lossReason: lossReason ? String(lossReason) : null,
      lastModified: parseDate(normalizedRow.last_modified || normalizedRow.modified_date),
      enteredPipeline: parseDate(enteredPipeline),
      homesBuilt: normalizedRow.homes_built ? parseInt(normalizedRow.homes_built) || null : null,
      snapshotDate
    });
  }

  console.log(`📊 Parsed ${processedData.length} opportunities from CSV file: ${filename}`);
  if (processedData.length === 0) {
    console.log(`❌ No valid opportunities found in CSV file - all rows were skipped`);
    console.log(`🔍 Raw data sample:`, rawData.slice(0, 3));
  } else {
    console.log(`✅ Successfully parsed ${processedData.length} opportunities`);
    console.log(`📋 Sample processed data:`, processedData.slice(0, 2));
  }
  return processedData;
}