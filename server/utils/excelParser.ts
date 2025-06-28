import * as XLSX from "xlsx";
import { extractDateFromFilename, normalizeHeader } from "./fileUtils";
import { normalizeStage, findHeaderRow } from "./excelUtils";

// Helper function to parse Excel data
export async function parseExcelData(buffer: Buffer, filename: string) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  
  if (!worksheet || !worksheet['!ref']) {
    throw new Error('Invalid or empty Excel file');
  }

  const headerRowIndex = findHeaderRow(worksheet);

  const snapshotDate = extractDateFromFilename(filename);
  
  if (!snapshotDate) {
    throw new Error('Could not extract date from filename. Expected format: Open Pipeline - Finance-YYYY-MM-DD-HH-MM-SS.xlsx');
  }

  // Convert to JSON starting from header row
  const rawData = XLSX.utils.sheet_to_json(worksheet, { 
    range: headerRowIndex,
    defval: null 
  });

  if (rawData.length === 0) {
    throw new Error('No data found in Excel file');
  }

  const processedData = [];
  
  // Track values for pivot table format (inherit from rows above)
  let currentStage = '';
  let currentConfidence = '';
  
  // Enhanced column header debugging
  if (rawData.length > 0) {
    const headers = Object.keys(rawData[0] as Record<string, any>);
    console.log('📋 Excel column headers found:', headers);
    console.log('📋 Normalized headers:', headers.map(h => normalizeHeader(h)));
    
    // Check specifically for entered pipeline date column
    const pipelineHeaders = headers.filter(h => 
      h.toLowerCase().includes('pipeline') || h.toLowerCase().includes('entered')
    );
    console.log('🔍 Pipeline/Entered headers found:', pipelineHeaders);
    pipelineHeaders.forEach(h => {
      console.log(`  Original: "${h}" → Normalized: "${normalizeHeader(h)}"`);
    });
    
    // Check if entered pipeline date column exists in any form
    const enteredPipelineColumn = headers.find(h => 
      normalizeHeader(h) === 'entered_pipeline_date'
    );
    if (enteredPipelineColumn) {
      console.log('🎯 FOUND ENTERED PIPELINE DATE COLUMN:', enteredPipelineColumn);
      // Check first few values
      for (let i = 0; i < Math.min(10, rawData.length); i++) {
        const row = rawData[i] as any;
        const value = row[enteredPipelineColumn];
        console.log(`  Row ${i + 1} Entered Pipeline value: "${value}" (type: ${typeof value})`);
      }
    } else {
      console.log('❌ Entered Pipeline Date column not found in headers');
    }
  }

  for (const row of rawData) {
    const normalizedRow: any = {};
    
    // Normalize all headers and log them for debugging
    for (const [key, value] of Object.entries(row as Record<string, any>)) {
      const normalizedKey = normalizeHeader(key);
      normalizedRow[normalizedKey] = value;
    }
    
    // Debug: Log the first row's headers to see what we have
    if (processedData.length === 0) {
      console.log('📋 Available headers:', Object.keys(normalizedRow));
      console.log('📋 Sample TCV value:', normalizedRow.tcv);
      console.log('📋 Sample total_contract_value:', normalizedRow.total_contract_value);
      
      // Check for entered pipeline date specifically
      const pipelineKeys = Object.keys(normalizedRow).filter(key => 
        key.includes('pipeline') || key.includes('entered')
      );
      console.log('🔍 Pipeline-related keys found:', pipelineKeys);
      pipelineKeys.forEach(key => {
        console.log(`  ${key}: ${normalizedRow[key]} (type: ${typeof normalizedRow[key]})`);
      });
      
      console.log('📋 All values for first row:', normalizedRow);
    }

    // Handle pivot table format - update current stage/confidence when they have values
    if (normalizedRow.stage && normalizedRow.stage.trim() !== '') {
      currentStage = await normalizeStage(normalizedRow.stage.trim());
    }
    if (normalizedRow.confidence && normalizedRow.confidence.trim() !== '') {
      currentConfidence = normalizedRow.confidence.trim();
    }

    // Only process rows with actual opportunity data (Opportunity ID starting with "006")
    const hasOpportunityId = normalizedRow.opportunity_id && 
                             typeof normalizedRow.opportunity_id === 'string' && 
                             normalizedRow.opportunity_id.startsWith('006');
    
    if (!hasOpportunityId) {
      continue;
    }

    // For rows with opportunity data, inherit stage/confidence from above if empty
    if (!normalizedRow.stage || normalizedRow.stage.trim() === '') {
      normalizedRow.stage = currentStage;
    } else {
      normalizedRow.stage = await normalizeStage(normalizedRow.stage.trim());
    }
    if (!normalizedRow.confidence || normalizedRow.confidence.trim() === '') {
      normalizedRow.confidence = currentConfidence;
    }

    // Skip if we still don't have required data
    if (!normalizedRow.account_name && !normalizedRow.opportunity_name) {
      continue;
    }

    // Map common field variations
    const opportunityName = normalizedRow.opportunity_name || 
                            normalizedRow.deal_name || 
                            normalizedRow.name ||
                            normalizedRow.account_name ||
                            'Unknown Opportunity';
    
    // Extract TCV from various possible column names - TCV column normalizes to lowercase 'tcv'
    const tcv = normalizedRow.tcv || 
                normalizedRow.total_contract_value ||
                normalizedRow.total_contract_val ||
                normalizedRow.contract_value ||
                normalizedRow.lifetime_value ||
                0;
    
    const amount = normalizedRow.year1_value || 
                   normalizedRow.y1_value ||
                   normalizedRow.first_year_value ||
                   normalizedRow.year_1_platform_fee ||
                   0;

    const lossReason = normalizedRow.loss_dq_reason || 
                       normalizedRow.lossdq_reason || 
                       normalizedRow.loss_reason || 
                       normalizedRow.dq_reason || 
                       normalizedRow.disqualification_reason || 
                       null;

    // Enhanced debugging for first few rows
    if (processedData.length < 5) {
      console.log(`🔍 Data Debug - Row ${processedData.length + 1} (${opportunityName}):`);
      console.log('  TCV value:', tcv, typeof tcv);
      console.log('  Year1 value:', normalizedRow.year1_value || normalizedRow.year_1_platform_fee);
      console.log('  Amount field:', amount);
      console.log('  Loss/DQ Reason:', lossReason);
      
      // Show loss reason related keys
      const allKeys = Object.keys(normalizedRow);
      const lossKeys = allKeys.filter(key => 
        key.includes('loss') || key.includes('dq') || key.includes('reason')
      );
      
      if (lossKeys.length > 0) {
        console.log('  Loss-related keys found:', lossKeys);
        lossKeys.forEach(key => {
          console.log(`    ${key}: ${normalizedRow[key]}`);
        });
      }
    }

    const year1Value = normalizedRow.year1_value || 
                       normalizedRow.y1_value ||
                       normalizedRow.first_year_value ||
                       normalizedRow.year_1_platform_fee ||
                       0;

    const year2Value = normalizedRow.year2_value || 
                       normalizedRow.y2_value ||
                       normalizedRow.second_year_value ||
                       normalizedRow.year_2_platform_fee ||
                       0;

    const year3Value = normalizedRow.year3_value || 
                       normalizedRow.y3_value ||
                       normalizedRow.third_year_value ||
                       normalizedRow.year_3_platform_fee ||
                       0;

    const barrValue = normalizedRow.barr_value || 
                      normalizedRow.barr ||
                      normalizedRow.annual_recurring_revenue ||
                      normalizedRow.blended_arr ||
                      0;

    const stage = normalizedRow.stage || 
                  normalizedRow.pipeline_stage || 
                  normalizedRow.sales_stage ||
                  normalizedRow.current_stage ||
                  'Unknown';

    const clientName = normalizedRow.account_name || 
                       normalizedRow.client_name || 
                       normalizedRow.customer_name ||
                       normalizedRow.company_name ||
                       'Unknown Client';

    const owner = normalizedRow.opportunity_owner || 
                  normalizedRow.account_owner || 
                  normalizedRow.owner || 
                  normalizedRow.sales_rep ||
                  'Unknown';

    const expectedCloseDate = normalizedRow.expected_close_date || 
                              normalizedRow.close_date || 
                              normalizedRow.target_close_date ||
                              null;

    const enteredPipeline = normalizedRow.entered_pipeline_date ||
                            normalizedRow.entered_pipeline ||
                            normalizedRow.pipeline_entry_date ||
                            null;

    const lastModified = normalizedRow.last_modified_date || 
                         normalizedRow.last_modified || 
                         normalizedRow.modified_date ||
                         null;

    const homesBuilt = normalizedRow.homes_built || 
                       normalizedRow.current_homes_built ||
                       normalizedRow.number_of_homes ||
                       null;

    const targetAccount = normalizedRow.target_account || 
                          normalizedRow.target_account_flag ||
                          normalizedRow.is_target_account ||
                          null;

    // Parse various date formats
    const parseExcelDate = (value: any): Date | null => {
      if (!value) return null;
      
      // Handle Excel serial dates (numbers)
      if (typeof value === 'number') {
        return new Date((value - 25569) * 86400 * 1000);
      }
      
      // Handle string dates
      if (typeof value === 'string') {
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date;
      }
      
      // Handle Date objects
      if (value instanceof Date) {
        return value;
      }
      
      return null;
    };

    // Clean numeric values
    const cleanNumericValue = (value: any): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const cleaned = value.replace(/[,$]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };

    processedData.push({
      opportunityId: String(normalizedRow.opportunity_id),
      opportunityName: String(opportunityName),
      clientName: String(clientName),
      owner: String(owner),
      createdDate: parseExcelDate(normalizedRow.created_date),
      stage,
      confidence: normalizedRow.confidence || '',
      opportunityType: normalizedRow.opportunity_type || normalizedRow.type || null,
      amount: cleanNumericValue(amount),
      tcv: cleanNumericValue(tcv),
      expectedCloseDate: parseExcelDate(expectedCloseDate),
      closeDate: parseExcelDate(expectedCloseDate),
      billingStartDate: parseExcelDate(normalizedRow.billing_start_date),
      solutionsOffered: normalizedRow.solutions_offered || null,
      icp: normalizedRow.icp || null,
      numberOfContacts: normalizedRow.number_of_contacts ? parseInt(normalizedRow.number_of_contacts) || null : null,
      blendedwAverageTitle: normalizedRow.blended_average_title || null,
      year1Value: cleanNumericValue(year1Value),
      year2Value: cleanNumericValue(year2Value),
      year3Value: cleanNumericValue(year3Value),
      erpSystemInUse: normalizedRow.erp_system_in_use || null,
      age: normalizedRow.age ? parseInt(normalizedRow.age) || null : null,
      stageDuration: normalizedRow.stage_duration ? parseInt(normalizedRow.stage_duration) || null : null,
      stageBefore: normalizedRow.stage_before || null,
      lossReason: lossReason ? String(lossReason) : null,
      lastModified: parseExcelDate(lastModified),
      enteredPipeline: parseExcelDate(enteredPipeline),
      homesBuilt: homesBuilt ? parseInt(homesBuilt) || null : null,
      targetAccount: targetAccount ? parseInt(targetAccount) || null : null,
      snapshotDate
    });
  }

  return processedData;
}