import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUploadedFileSchema, opportunities, snapshots, uploadedFiles, type Opportunity, type Snapshot } from "@shared/schema";
import { db } from "./db";
import { sql } from "drizzle-orm";
import multer from "multer";
import * as XLSX from "xlsx";
import { z } from "zod";
import { setupAuth, isAuthenticated } from "./localAuthBypass";
import { requirePermission } from "./middleware/permissions";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Helper function to extract date from filename
function extractDateFromFilename(filename: string): Date | null {
  // Pattern: Open Pipeline - Finance-2025-05-06-14-49-48.xlsx
  const datePattern = /(\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2})/;
  const match = filename.match(datePattern);
  
  if (match) {
    const dateStr = match[1];
    // Parse format: 2025-05-06-14-49-48
    const [year, month, day, hour, minute, second] = dateStr.split('-');
    // Create UTC date using Date.UTC to ensure timezone agnostic handling
    return new Date(Date.UTC(
      parseInt(year), 
      parseInt(month) - 1, // months are 0-indexed
      parseInt(day), 
      parseInt(hour), 
      parseInt(minute), 
      parseInt(second)
    ));
  }
  
  return null;
}

// Helper function to normalize column headers
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

// Helper function to normalize stage names using dynamic mappings
async function normalizeStage(stage: string): Promise<string> {
  const trimmedStage = stage.trim();
  const mappings = await storage.settingsStorage.getStageMappings();
  
  // Check for dynamic mappings (case-insensitive)
  const mapping = mappings.find(m => m.from.toLowerCase() === trimmedStage.toLowerCase());
  if (mapping) {
    return mapping.to;
  }
  
  return trimmedStage;
}

// Helper function to find header row
function findHeaderRow(worksheet: XLSX.WorkSheet): number {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
  
  // Look for rows that contain typical pipeline headers
  const headerKeywords = ['opportunity', 'name', 'client', 'stage', 'amount', 'value', 'owner', 'deal', 'pipeline'];
  
  for (let row = 0; row <= Math.min(20, range.e.r); row++) {
    let foundHeaders = 0;
    let nonEmptyCells = 0;
    
    for (let col = 0; col <= Math.min(15, range.e.c); col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      if (cell && cell.v !== null && cell.v !== undefined && cell.v !== '') {
        nonEmptyCells++;
        if (typeof cell.v === 'string') {
          const cellValue = cell.v.toLowerCase();
          if (headerKeywords.some(keyword => cellValue.includes(keyword))) {
            foundHeaders++;
          }
        }
      }
    }
    
    console.log(`Row ${row}: ${nonEmptyCells} non-empty cells, ${foundHeaders} header matches`);
    
    // If we find a row with multiple non-empty cells and at least one header keyword
    if (nonEmptyCells >= 3 && foundHeaders >= 1) {
      return row;
    }
  }
  
  // If no clear header row found, look for the first row with multiple non-empty cells
  for (let row = 0; row <= Math.min(10, range.e.r); row++) {
    let nonEmptyCells = 0;
    for (let col = 0; col <= Math.min(15, range.e.c); col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      if (cell && cell.v !== null && cell.v !== undefined && cell.v !== '') {
        nonEmptyCells++;
      }
    }
    if (nonEmptyCells >= 5) {
      console.log(`Using row ${row} as header (${nonEmptyCells} non-empty cells)`);
      return row;
    }
  }
  
  return 0; // Default to first row if nothing else works
}

// Helper function to parse a CSV line with proper quote handling
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        // Escaped quote - add one quote to field
        currentField += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(currentField.trim());
      currentField = '';
      i++;
    } else {
      // Regular character
      currentField += char;
      i++;
    }
  }
  
  // Add the last field
  result.push(currentField.trim());
  
  return result;
}

// Helper function to parse CSV data
async function parseCSVData(buffer: Buffer, filename: string) {
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

// Helper function to parse Excel data
async function parseExcelData(buffer: Buffer, filename: string) {
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
                  normalizedRow.stage_ ||  // Handle "Stage  ↑" -> "stage_"
                  'Unknown';

    const owner = normalizedRow.owner || 
                  normalizedRow.deal_owner || 
                  normalizedRow.account_owner ||
                  normalizedRow.opportunity_owner ||
                  null;

    const clientName = normalizedRow.client_name || 
                       normalizedRow.account_name || 
                       normalizedRow.company ||
                       null;

    // Parse dates - timezone agnostic using UTC
    const parseDate = (dateValue: any) => {
      if (!dateValue) return null;
      if (dateValue instanceof Date) return dateValue;
      if (typeof dateValue === 'number') {
        // Excel date serial number - convert to UTC
        const utcTime = (dateValue - 25569) * 86400 * 1000;
        return new Date(utcTime);
      }
      if (typeof dateValue === 'string') {
        // Parse string dates and normalize to UTC
        const parsed = new Date(dateValue);
        if (isNaN(parsed.getTime())) return null;
        
        // If the date string doesn't include timezone info, treat it as UTC
        if (!dateValue.includes('T') && !dateValue.includes('Z') && !dateValue.includes('+') && !dateValue.includes('-', 10)) {
          // Date-only string like "2025-06-12" - create as UTC date
          const dateParts = dateValue.split(/[-\/]/);
          if (dateParts.length >= 3) {
            const year = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]) - 1; // months are 0-indexed
            const day = parseInt(dateParts[2]);
            return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
          }
        }
        return parsed;
      }
      return null;
    };

    const expectedCloseDate = parseDate(normalizedRow.expected_close_date || 
                                       normalizedRow.close_date ||
                                       normalizedRow.projected_close);
    
    const createdDate = parseDate(normalizedRow.created_date ||
                                  normalizedRow.date_created);
    
    const lastModified = parseDate(normalizedRow.last_modified ||
                                   normalizedRow.modified_date);
    
    const enteredPipelineRaw = normalizedRow.entered_pipeline_date ||
                              normalizedRow.entered_pipeline ||
                              normalizedRow.date_entered_pipeline;
    
    const enteredPipeline = parseDate(enteredPipelineRaw);
    
    // Debug entered pipeline date processing for first few rows
    if (processedData.length < 5) {
      console.log(`🔍 Row ${processedData.length + 1} entered pipeline debug:`);
      console.log(`  Raw value: ${enteredPipelineRaw} (type: ${typeof enteredPipelineRaw})`);
      console.log(`  Parsed value: ${enteredPipeline}`);
    }

    // Additional fields from your data file
    const confidence = normalizedRow.confidence || '';
    const opportunityType = normalizedRow.opportunity_type || normalizedRow.type || null;
    const closeDate = parseDate(normalizedRow.close_date);
    const billingStartDate = parseDate(normalizedRow.billing_start_date || normalizedRow.billing_start);
    const solutionsOffered = normalizedRow.solutions_offered || normalizedRow.solutions || null;
    const icp = normalizedRow.icp || normalizedRow.ideal_customer_profile || null;
    const numberOfContacts = normalizedRow.number_of_contacts || normalizedRow.num_contacts || normalizedRow.contact_count || null;
    const blendedwAverageTitle = normalizedRow.blended_average_title || normalizedRow.avg_title || null;
    const erpSystemInUse = normalizedRow.erp_system_in_use || normalizedRow.erp_system || null;
    const age = normalizedRow.age || null;
    const stageDuration = normalizedRow.stage_duration || normalizedRow.duration || null;
    const stageBefore = normalizedRow.stage_before || normalizedRow.previous_stage || null;
    const homesBuilt = normalizedRow.homes_built || normalizedRow.homes || null;

    processedData.push({
      opportunityId: normalizedRow.opportunity_id,
      opportunityName,
      clientName,
      owner,
      createdDate,
      stage,
      confidence,
      opportunityType,
      amount: typeof year1Value === 'number' ? year1Value : parseFloat(year1Value) || 0,
      tcv: typeof tcv === 'number' ? tcv : parseFloat(tcv) || 0,
      expectedCloseDate,
      closeDate,
      billingStartDate,
      solutionsOffered,
      icp,
      numberOfContacts: numberOfContacts ? parseInt(numberOfContacts) || null : null,
      blendedwAverageTitle,
      year1Value: typeof year1Value === 'number' ? year1Value : parseFloat(year1Value) || 0,
      year2Value: typeof year2Value === 'number' ? year2Value : parseFloat(year2Value) || 0,
      year3Value: typeof year3Value === 'number' ? year3Value : parseFloat(year3Value) || 0,

      erpSystemInUse,
      age: age ? parseInt(age) || null : null,
      stageDuration: stageDuration ? parseInt(stageDuration) || null : null,
      stageBefore,
      lossReason,
      lastModified,
      enteredPipeline,
      homesBuilt: homesBuilt ? parseInt(homesBuilt) || null : null,
      snapshotDate
    });
  }

  return processedData;
}

// Generic file parser that handles both Excel and CSV
async function parseFileData(buffer: Buffer, filename: string) {
  console.log(`🔍 parseFileData called with filename: ${filename}, buffer size: ${buffer.length}`);
  
  if (filename.endsWith('.csv')) {
    console.log(`📋 Routing to CSV parser for: ${filename}`);
    return await parseCSVData(buffer, filename);
  } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
    console.log(`📊 Routing to Excel parser for: ${filename}`);
    return await parseExcelData(buffer, filename);
  } else {
    throw new Error('Unsupported file format');
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication is already set up in index.ts

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // Handle both Replit user format and local mock user format
      const user = req.user;
      const userData = {
        id: user.claims?.sub || user.id || 'local-dev-user',
        email: user.claims?.email || user.email || 'developer@localhost.com',
        name: user.claims ? `${user.claims.first_name || ''} ${user.claims.last_name || ''}`.trim() : user.name || 'Local Developer',
        firstName: user.claims?.first_name || user.firstName || 'Local',
        lastName: user.claims?.last_name || user.lastName || 'Developer',
        profileImageUrl: user.claims?.profile_image_url || user.profileImageUrl || null
      };
      
      console.log('🔍 Returning user data from main routes:', userData);
      res.json(userData);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Database management routes (protected)
  app.get("/api/database/tables", isAuthenticated, requirePermission('database'), async (req, res) => {
    try {
      // First get all table names
      const tablesResult = await db.execute(sql`
        SELECT table_name
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `);
      
      const tables = [];
      
      // Get row count for each table
      for (const row of tablesResult.rows) {
        const tableName = (row as any).table_name;
        try {
          const countResult = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM "${tableName}"`));
          const rowCount = Number(countResult.rows[0]?.count || 0);
          tables.push({
            table_name: tableName,
            row_count: rowCount
          });
        } catch (err) {
          console.log(`Could not count ${tableName}:`, err);
          tables.push({
            table_name: tableName,
            row_count: 0
          });
        }
      }
      
      res.json(tables);
    } catch (error) {
      console.error('Error fetching tables:', error);
      res.status(500).json({ error: 'Failed to fetch tables' });
    }
  });

  app.post("/api/database/execute", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query is required' });
      }

      // Basic SQL injection protection - only allow SELECT, INSERT, UPDATE, DELETE
      const trimmedQuery = query.trim().toLowerCase();
      if (!trimmedQuery.startsWith('select') && 
          !trimmedQuery.startsWith('insert') && 
          !trimmedQuery.startsWith('update') && 
          !trimmedQuery.startsWith('delete') &&
          !trimmedQuery.startsWith('with')) {
        return res.status(400).json({ error: 'Only SELECT, INSERT, UPDATE, DELETE, and WITH queries are allowed' });
      }

      const result = await db.execute(sql.raw(query));
      
      console.log('SQL Query Result:', {
        hasFields: !!result.fields,
        fieldsLength: result.fields?.length,
        hasRows: !!result.rows,
        rowsLength: result.rows?.length,
        firstRowType: result.rows?.[0] ? typeof result.rows[0] : 'undefined',
        isFirstRowArray: result.rows?.[0] ? Array.isArray(result.rows[0]) : false,
        firstRowKeys: result.rows?.[0] ? Object.keys(result.rows[0]) : []
      });
      
      // Extract column names from the first row if available, or from fields
      let columns: string[] = [];
      if (result.fields && result.fields.length > 0) {
        columns = result.fields.map((f: any) => f.name);
      } else if (result.rows && result.rows.length > 0 && typeof result.rows[0] === 'object' && !Array.isArray(result.rows[0])) {
        columns = Object.keys(result.rows[0]);
      }
      
      // Convert rows to array of arrays format
      let rows: any[][] = [];
      if (result.rows && Array.isArray(result.rows) && result.rows.length > 0) {
        if (typeof result.rows[0] === 'object' && !Array.isArray(result.rows[0])) {
          // Convert object rows to array rows
          rows = result.rows.map((row: any) => columns.map(col => row[col] ?? null));
        } else if (Array.isArray(result.rows[0])) {
          // Already in array format
          rows = result.rows.map((row: any) => Array.isArray(row) ? row : Object.values(row));
        } else {
          // Single value rows
          rows = result.rows.map((row: any) => [row]);
        }
      }
      
      console.log('Processed result:', {
        columns: columns.length,
        rows: rows.length,
        sampleRow: rows[0]
      });
      
      res.json({
        columns,
        rows,
        rowCount: result.rowCount || rows.length || 0
      });
    } catch (error) {
      console.error('Error executing query:', error);
      res.json({
        columns: [],
        rows: [],
        rowCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  app.delete("/api/data/clear", isAuthenticated, async (req, res) => {
    try {
      await storage.clearAllData();
      res.json({ success: true });
    } catch (error) {
      console.error('Error clearing data:', error);
      res.status(500).json({ error: 'Failed to clear data' });
    }
  });
  
  // Upload and process Excel files (protected)
  app.post('/api/upload', isAuthenticated, upload.array('files'), async (req: any, res) => {
    try {
      const files = req.files;
      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }

      const results = [];
      
      for (const file of files) {
        try {
          console.log(`🗂️ Processing file: ${file.originalname} (${file.size} bytes)`);
          
          // Validate file type
          if (!file.originalname.endsWith('.xlsx') && !file.originalname.endsWith('.xls') && !file.originalname.endsWith('.csv')) {
            results.push({
              filename: file.originalname,
              status: 'error',
              error: 'Only Excel files (.xlsx/.xls) and CSV files (.csv) are supported'
            });
            continue;
          }

          console.log(`📋 Parsing file data for: ${file.originalname}`);
          
          // If it's a CSV file, change the extension to .xls for processing
          let processFilename = file.originalname;
          if (file.originalname.endsWith('.csv')) {
            processFilename = file.originalname.replace(/\.csv$/i, '.xls');
            console.log(`🔄 Converting CSV to XLS format for processing: ${file.originalname} -> ${processFilename}`);
          }
          
          const parsedData = await parseFileData(file.buffer, processFilename);
          console.log(`✅ Parsed ${parsedData.length} records from ${file.originalname}`);
          
          const snapshotDate = extractDateFromFilename(file.originalname);
          console.log(`📅 Extracted snapshot date: ${snapshotDate}`);
          
          if (parsedData.length === 0) {
            console.log(`⚠️ No data found in file: ${file.originalname}`);
            results.push({
              filename: file.originalname,
              status: 'error',
              error: 'No valid data found in file'
            });
            continue;
          }
          
          // Clear existing data for this date before inserting new data
          if (snapshotDate) {
            console.log(`🗑️ Clearing existing data for date: ${snapshotDate.toISOString().split('T')[0]}`);
            await storage.clearDataByDate(snapshotDate);
          }
          
          // Save file record
          const uploadedFile = await storage.createUploadedFile({
            filename: file.originalname,
            snapshotDate,
            recordCount: parsedData.length,
            status: 'processed'
          });

          let processedCount = 0;
          
          // Process each row
          for (const row of parsedData as any[]) {
            // Find or create opportunity by ID, not name
            let opportunity = await storage.opportunitiesStorage.getOpportunityById(row.opportunityId);
            if (!opportunity) {
              console.log(`📝 Creating NEW opportunity: ${row.opportunityId} - ${row.opportunityName}`);
            } else {
              console.log(`📋 Found EXISTING opportunity: ${row.opportunityId} - ${opportunity.name}`);
            }
            if (!opportunity) {
              opportunity = await storage.opportunitiesStorage.createOpportunity({
                opportunityId: row.opportunityId,
                name: row.opportunityName,
                clientName: row.clientName,
                owner: row.owner,
                createdDate: row.createdDate
              });
            }

            // Create snapshot with all fields
            await storage.snapshotsStorage.createSnapshot({
              opportunityId: opportunity.id,
              snapshotDate: row.snapshotDate,
              stage: row.stage,
              confidence: row.confidence,
              opportunityName: row.opportunityName,
              opportunityType: row.opportunityType,
              accountName: row.clientName,
              amount: row.year1Value,
              tcv: row.tcv,
              expectedCloseDate: row.expectedCloseDate,
              closeDate: row.closeDate,
              billingStartDate: row.billingStartDate,
              solutionsOffered: row.solutionsOffered,
              icp: row.icp,
              numberOfContacts: row.numberOfContacts,
              blendedwAverageTitle: row.blendedwAverageTitle,
              year1Value: row.year1Value,
              year2Value: row.year2Value,
              year3Value: row.year3Value,

              erpSystemInUse: row.erpSystemInUse,
              age: row.age,
              stageDuration: row.stageDuration,
              stageBefore: row.stageBefore,
              lossReason: row.lossReason,
              createdDate: row.createdDate,
              lastModified: row.lastModified,
              enteredPipeline: row.enteredPipeline,
              homesBuilt: row.homesBuilt
            });

            processedCount++;
          }

          results.push({
            filename: file.originalname,
            recordCount: processedCount,
            snapshotDate,
            status: 'success'
          });
          
        } catch (error) {
          console.error(`❌ Error processing file ${file.originalname}:`, error);
          console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
          results.push({
            filename: file.originalname,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      res.json({ results });
      
    } catch (error) {
      res.status(500).json({ 
        message: 'Upload failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Get all opportunities with latest snapshot data (protected)
  app.get('/api/opportunities', isAuthenticated, async (req, res) => {
    try {
      const { 
        startDate, 
        endDate, 
        stages, 
        owner, 
        minValue, 
        maxValue,
        search 
      } = req.query;

      let opportunities = await storage.opportunitiesStorage.getAllOpportunities();
      
      // Apply search filter
      if (search && typeof search === 'string') {
        const searchLower = search.toLowerCase();
        opportunities = opportunities.filter(opp => 
          opp.name.toLowerCase().includes(searchLower) ||
          (opp.clientName && opp.clientName.toLowerCase().includes(searchLower)) ||
          (opp.owner && opp.owner.toLowerCase().includes(searchLower))
        );
      }

      // Get latest snapshots and apply filters
      const enrichedOpportunities = [];
      
      for (const opportunity of opportunities) {
        const latestSnapshot = await storage.getLatestSnapshotByOpportunity(opportunity.id);
        
        if (!latestSnapshot) continue;

        // Apply filters
        if (startDate && new Date(latestSnapshot.snapshotDate) < new Date(startDate as string)) continue;
        if (endDate && new Date(latestSnapshot.snapshotDate) > new Date(endDate as string)) continue;
        if (stages && typeof stages === 'string') {
          const stageList = stages.split(',');
          if (!stageList.includes(latestSnapshot.stage || '')) continue;
        }
        if (owner && owner !== 'all' && latestSnapshot.opportunityId) {
          const opp = await storage.opportunitiesStorage.getOpportunity(latestSnapshot.opportunityId);
          if (opp?.owner !== owner) continue;
        }
        if (minValue && (latestSnapshot.year1Value || 0) < parseFloat(minValue as string)) continue;
        if (maxValue && (latestSnapshot.year1Value || 0) > parseFloat(maxValue as string)) continue;

        enrichedOpportunities.push({
          ...opportunity,
          latestSnapshot
        });
      }

      res.json(enrichedOpportunities);
    } catch (error) {
      res.status(500).json({ 
        message: 'Failed to fetch opportunities', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Export opportunity stage history as CSV (protected)
  app.get('/api/export/opportunity-stage-history', isAuthenticated, async (req, res) => {
    try {
      console.log('📋 Starting CSV export for opportunity stage history');
      
      // Get all opportunities and their snapshots
      const allOpportunities = await storage.opportunitiesStorage.getAllOpportunities();
      const allSnapshots = await storage.getAllSnapshots();
      
      console.log(`📋 Found ${allOpportunities.length} opportunities and ${allSnapshots.length} snapshots`);
      
      // Group snapshots by opportunity
      const opportunitySnapshots = new Map<number, any[]>();
      allSnapshots.forEach(snapshot => {
        if (snapshot.opportunityId) {
          if (!opportunitySnapshots.has(snapshot.opportunityId)) {
            opportunitySnapshots.set(snapshot.opportunityId, []);
          }
          opportunitySnapshots.get(snapshot.opportunityId)!.push(snapshot);
        }
      });
      
      const csvRows: string[] = [];
      
      // CSV headers
      csvRows.push([
        'Opportunity ID',
        'Opportunity Name',
        'Client Name',
        'Owner',
        'Stage',
        'Stage Entry Date',
        'Stage Exit Date',
        'Days in Stage',
        'Amount',
        'TCV',
        'Expected Close Date',
        'Loss Reason',
        'Snapshot Date'
      ].join(','));
      
      let totalStageTransitions = 0;
      
      for (const opportunity of allOpportunities) {
        const snapshots = opportunitySnapshots.get(opportunity.id);
        if (!snapshots || snapshots.length === 0) continue;
        
        // Sort snapshots by date
        const sortedSnapshots = snapshots.sort((a, b) => 
          new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
        );
        
        // Track stage transitions
        let currentStage: string | null = null;
        let stageEntryDate: Date | null = null;
        
        for (let i = 0; i < sortedSnapshots.length; i++) {
          const snapshot = sortedSnapshots[i];
          const snapshotDate = new Date(snapshot.snapshotDate);
          
          if (!snapshot.stage) continue;
          
          // Stage change detected or first snapshot
          if (currentStage !== snapshot.stage) {
            // If we were tracking a previous stage, export its data
            if (currentStage && stageEntryDate) {
              const daysInStage = Math.round((snapshotDate.getTime() - stageEntryDate.getTime()) / (1000 * 60 * 60 * 24));
              
              // Find the snapshot that represents this stage period
              const stageSnapshot = sortedSnapshots[i - 1] || snapshot;
              
              csvRows.push([
                `"${opportunity.opportunityId || ''}"`,
                `"${opportunity.name || ''}"`,
                `"${opportunity.clientName || ''}"`,
                `"${opportunity.owner || ''}"`,
                `"${currentStage}"`,
                `"${stageEntryDate.toISOString().split('T')[0]}"`,
                `"${snapshotDate.toISOString().split('T')[0]}"`,
                `${daysInStage}`,
                `${stageSnapshot.amount || 0}`,
                `${stageSnapshot.tcv || 0}`,
                `"${stageSnapshot.expectedCloseDate ? new Date(stageSnapshot.expectedCloseDate).toISOString().split('T')[0] : ''}"`,
                `"${stageSnapshot.lossReason || ''}"`,
                `"${new Date(stageSnapshot.snapshotDate).toISOString().split('T')[0]}"`
              ].join(','));
              
              totalStageTransitions++;
            }
            
            // Start tracking new stage
            currentStage = snapshot.stage;
            stageEntryDate = snapshotDate;
          }
        }
        
        // Handle the final stage (ongoing)
        if (currentStage && stageEntryDate && sortedSnapshots.length > 0) {
          const latestSnapshot = sortedSnapshots[sortedSnapshots.length - 1];
          const today = new Date();
          const daysInStage = Math.round((today.getTime() - stageEntryDate.getTime()) / (1000 * 60 * 60 * 24));
          
          csvRows.push([
            `"${opportunity.opportunityId || ''}"`,
            `"${opportunity.name || ''}"`,
            `"${opportunity.clientName || ''}"`,
            `"${opportunity.owner || ''}"`,
            `"${currentStage}"`,
            `"${stageEntryDate.toISOString().split('T')[0]}"`,
            `"${today.toISOString().split('T')[0]}"`,
            `${daysInStage}`,
            `${latestSnapshot.amount || 0}`,
            `${latestSnapshot.tcv || 0}`,
            `"${latestSnapshot.expectedCloseDate ? new Date(latestSnapshot.expectedCloseDate).toISOString().split('T')[0] : ''}"`,
            `"${latestSnapshot.lossReason || ''}"`,
            `"${new Date(latestSnapshot.snapshotDate).toISOString().split('T')[0]}"`
          ].join(','));
          
          totalStageTransitions++;
        }
      }
      
      console.log(`📋 Generated CSV with ${totalStageTransitions} stage transitions`);
      
      const csvContent = csvRows.join('\n');
      
      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="opportunity-stage-history.csv"');
      res.send(csvContent);
      
    } catch (error) {
      console.error('❌ Error generating CSV export:', error);
      res.status(500).json({ 
        error: 'Failed to generate CSV export',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Lightweight win rate endpoint (protected)
  app.get("/api/analytics/win-rate", isAuthenticated, requirePermission('sales'), async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      // Get the most recent snapshot date efficiently
      const latestSnapshotResult = await db.select({ 
        maxDate: sql<string>`MAX(DATE(${snapshots.snapshotDate}))` 
      }).from(snapshots);
      
      const latestSnapshotDate = latestSnapshotResult[0]?.maxDate 
        ? new Date(latestSnapshotResult[0].maxDate + 'T00:00:00.000Z')
        : new Date(0);
      
      // Query only latest snapshots for win rate calculation
      const latestSnapshots = await db.select().from(snapshots)
        .where(sql`DATE(${snapshots.snapshotDate}) = ${latestSnapshotDate.toISOString().split('T')[0]}`);
      
      // Filter by fiscal year deals that entered pipeline
      let filteredSnapshots = latestSnapshots.filter(snapshot => {
        if (!snapshot.enteredPipeline) return false;
        
        // Apply date range if provided
        if (startDate && endDate && snapshot.closeDate) {
          const closeDate = new Date(snapshot.closeDate);
          return closeDate >= new Date(startDate) && closeDate <= new Date(endDate);
        }
        return true;
      });
      
      // Count closed deals (won vs lost)
      const closedDeals = filteredSnapshots.filter(s => 
        s.stage === 'Closed Won' || s.stage === 'Closed Lost'
      );
      
      const closedWon = closedDeals.filter(s => s.stage === 'Closed Won').length;
      const closedLost = closedDeals.filter(s => s.stage === 'Closed Lost').length;
      const totalClosed = closedWon + closedLost;
      
      const winRate = totalClosed > 0 ? (closedWon / totalClosed) * 100 : 0;
      
      res.json({ 
        conversionRate: parseFloat(winRate.toFixed(1)),
        closedWon,
        closedLost,
        totalClosed
      });
    } catch (error) {
      console.error('❌ Error calculating win rate:', error);
      res.status(500).json({ error: 'Failed to calculate win rate' });
    }
  });

  // Lightweight pipeline metrics endpoint (protected)
  app.get("/api/analytics/pipeline-metrics", isAuthenticated, requirePermission('sales'), async (req, res) => {
    try {
      // Get the most recent snapshot date efficiently
      const latestSnapshotResult = await db.select({ 
        maxDate: sql<string>`MAX(DATE(${snapshots.snapshotDate}))` 
      }).from(snapshots);
      
      const latestSnapshotDate = latestSnapshotResult[0]?.maxDate 
        ? new Date(latestSnapshotResult[0].maxDate + 'T00:00:00.000Z')
        : new Date(0);
      
      // Query only latest snapshots for pipeline metrics
      const latestSnapshots = await db.select().from(snapshots)
        .where(sql`DATE(${snapshots.snapshotDate}) = ${latestSnapshotDate.toISOString().split('T')[0]}`);
      
      // Filter active pipeline stages (exclude closed and validation)
      const activeSnapshots = latestSnapshots.filter(s => 
        !s.stage?.includes('Closed Won') && 
        !s.stage?.includes('Closed Lost') && 
        s.stage !== 'Validation/Introduction'
      );
      
      const totalValue = activeSnapshots.reduce((sum, s) => sum + (s.tcv || 0), 0);
      const totalYear1Arr = activeSnapshots.reduce((sum, s) => sum + (s.amount || 0), 0);
      const activeCount = activeSnapshots.length;
      const avgDealSize = activeCount > 0 ? totalYear1Arr / activeCount : 0;
      
      // Get closed won deals for avgDealSizeClosedWon
      const closedWonSnapshots = latestSnapshots.filter(s => s.stage === 'Closed Won');
      const closedWonYear1Arr = closedWonSnapshots.reduce((sum, s) => sum + (s.amount || 0), 0);
      const avgDealSizeClosedWon = closedWonSnapshots.length > 0 ? closedWonYear1Arr / closedWonSnapshots.length : 0;
      
      res.json({
        totalValue,
        totalYear1Arr,
        totalContractValue: totalValue,
        activeCount,
        avgDealSize,
        avgDealSizeClosedWon,
        avgDealSizePipeline: avgDealSize
      });
    } catch (error) {
      console.error('❌ Error calculating pipeline metrics:', error);
      res.status(500).json({ error: 'Failed to calculate pipeline metrics' });
    }
  });

  // Lightweight pipeline value endpoint (protected)
  app.get("/api/analytics/pipeline-value", isAuthenticated, requirePermission('sales'), async (req, res) => {
    try {
      const { startDate, endDate, period } = req.query;
      
      // Get the most recent snapshot date
      const latestDateResult = await storage.getAllSnapshots();
      const latestSnapshotDate = latestDateResult.reduce((latest, snapshot) => {
        const snapshotDate = new Date(snapshot.snapshotDate);
        return snapshotDate > latest ? snapshotDate : latest;
      }, new Date(0));
      
      // Query only latest snapshots
      const latestSnapshots = await db.select().from(snapshots)
        .where(sql`DATE(${snapshots.snapshotDate}) = ${latestSnapshotDate.toISOString().split('T')[0]}`);
      
      // Filter active pipeline stages (exclude closed and validation)
      let activeSnapshots = latestSnapshots.filter(s => 
        !s.stage?.includes('Closed Won') && 
        !s.stage?.includes('Closed Lost') && 
        s.stage !== 'Validation/Introduction'
      );
      
      // Apply date range filtering if provided
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate as string) : new Date(0);
        const end = endDate ? new Date(endDate as string) : new Date();
        
        activeSnapshots = activeSnapshots.filter(s => {
          const createdDate = s.createdDate ? new Date(s.createdDate) : new Date(0);
          return createdDate >= start && createdDate <= end;
        });
      }
      
      // Calculate pipeline value by date
      const pipelineData = activeSnapshots.reduce((acc, snapshot) => {
        const date = snapshot.snapshotDate.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = 0;
        }
        acc[date] += snapshot.amount || 0;
        return acc;
      }, {} as Record<string, number>);
      
      // Convert to array format expected by chart
      const chartData = Object.entries(pipelineData).map(([date, value]) => ({
        date: new Date(date),
        value,
        timestamp: new Date(date).getTime()
      })).sort((a, b) => a.timestamp - b.timestamp);
      
      res.json(chartData);
    } catch (error) {
      console.error('❌ Error calculating pipeline value:', error);
      res.status(500).json({ error: 'Failed to calculate pipeline value' });
    }
  });

  // Lightweight stage distribution endpoint (protected)
  app.get("/api/analytics/stage-distribution", isAuthenticated, requirePermission('sales'), async (req, res) => {
    try {
      // Get the most recent snapshot date
      const latestDateResult = await storage.getAllSnapshots();
      const latestSnapshotDate = latestDateResult.reduce((latest, snapshot) => {
        const snapshotDate = new Date(snapshot.snapshotDate);
        return snapshotDate > latest ? snapshotDate : latest;
      }, new Date(0));
      
      // Query only latest snapshots
      const latestSnapshots = await db.select().from(snapshots)
        .where(sql`DATE(${snapshots.snapshotDate}) = ${latestSnapshotDate.toISOString().split('T')[0]}`);
      
      // Filter active pipeline stages (exclude closed and validation)
      const activeSnapshots = latestSnapshots.filter(s => 
        !s.stage?.includes('Closed Won') && 
        !s.stage?.includes('Closed Lost') && 
        s.stage !== 'Validation/Introduction'
      );
      
      // Group by stage
      const stageGroups = activeSnapshots.reduce((acc, snapshot) => {
        const stage = snapshot.stage || 'Unknown';
        if (!acc[stage]) {
          acc[stage] = { count: 0, value: 0 };
        }
        acc[stage].count++;
        acc[stage].value += snapshot.amount || 0;
        return acc;
      }, {} as Record<string, { count: number; value: number }>);
      
      // Convert to array format
      const stageDistribution = Object.entries(stageGroups).map(([stage, data]) => ({
        stage,
        count: data.count,
        value: data.value
      }));
      
      res.json(stageDistribution);
    } catch (error) {
      console.error('❌ Error calculating stage distribution:', error);
      res.status(500).json({ error: 'Failed to calculate stage distribution' });
    }
  });

  // Lightweight fiscal pipeline endpoint (protected)
  app.get("/api/analytics/fiscal-pipeline", isAuthenticated, requirePermission('sales'), async (req, res) => {
    try {
      // Get the most recent snapshot date
      const latestDateResult = await storage.getAllSnapshots();
      const latestSnapshotDate = latestDateResult.reduce((latest, snapshot) => {
        const snapshotDate = new Date(snapshot.snapshotDate);
        return snapshotDate > latest ? snapshotDate : latest;
      }, new Date(0));
      
      // Query only latest snapshots
      const latestSnapshots = await db.select().from(snapshots)
        .where(sql`DATE(${snapshots.snapshotDate}) = ${latestSnapshotDate.toISOString().split('T')[0]}`);
      
      // Filter active pipeline stages (exclude closed and validation)
      const activeSnapshots = latestSnapshots.filter(s => 
        !s.stage?.includes('Closed Won') && 
        !s.stage?.includes('Closed Lost') && 
        s.stage !== 'Validation/Introduction'
      );
      
      // Helper functions for fiscal calculations
      const getFiscalYear = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return month >= 1 ? year : year - 1; // FY starts in Feb (month 1)
      };
      
      const getFiscalQuarter = (date: Date) => {
        const fiscalYear = getFiscalYear(date);
        const month = date.getMonth();
        
        if (month >= 1 && month <= 3) return `FY${fiscalYear + 1} Q1`;
        if (month >= 4 && month <= 6) return `FY${fiscalYear + 1} Q2`;
        if (month >= 7 && month <= 9) return `FY${fiscalYear + 1} Q3`;
        return `FY${fiscalYear + 1} Q4`;
      };
      
      const getMonthYear = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      };
      
      // For current fiscal pipeline, we should group by current fiscal periods
      // All current pipeline should be in current fiscal year (FY2025)
      const currentFiscalYear = 'FY2025';
      // Use Year 1 ARR value for fiscal analysis, not amount (which is TCV)
      const totalPipelineValue = activeSnapshots.reduce((sum, snapshot) => sum + (snapshot.year1Value || 0), 0);
      
      // Group by fiscal year - current pipeline is all FY2025
      const fiscalYearGroups = { [currentFiscalYear]: totalPipelineValue };
      
      // Group by fiscal quarter based on close dates for current opportunities
      const fiscalQuarterGroups = activeSnapshots.reduce((acc, snapshot) => {
        // Use close date if available, otherwise use current date for fiscal quarter
        const closeDate = snapshot.closeDate ? new Date(snapshot.closeDate) : new Date();
        const fiscalQuarter = getFiscalQuarter(closeDate);
        
        if (!acc[fiscalQuarter]) acc[fiscalQuarter] = 0;
        acc[fiscalQuarter] += snapshot.year1Value || 0;
        return acc;
      }, {} as Record<string, number>);
      
      // Group by month based on close dates for current opportunities
      const monthlyGroups = activeSnapshots.reduce((acc, snapshot) => {
        // Use close date if available, otherwise use current date for monthly grouping
        const closeDate = snapshot.closeDate ? new Date(snapshot.closeDate) : new Date();
        const monthYear = getMonthYear(closeDate);
        
        if (!acc[monthYear]) acc[monthYear] = 0;
        acc[monthYear] += snapshot.year1Value || 0;
        return acc;
      }, {} as Record<string, number>);
      
      // Convert to arrays
      const fiscalYearPipeline = Object.entries(fiscalYearGroups).map(([fiscalYear, value]) => ({
        fiscalYear,
        value
      }));
      
      const fiscalQuarterPipeline = Object.entries(fiscalQuarterGroups).map(([fiscalQuarter, value]) => ({
        fiscalQuarter,
        value
      }));
      
      const monthlyPipeline = Object.entries(monthlyGroups).map(([month, value]) => ({
        month,
        value
      }));
      
      res.json({
        fiscalYearPipeline,
        fiscalQuarterPipeline,
        monthlyPipeline
      });
    } catch (error) {
      console.error('❌ Error calculating fiscal pipeline data:', error);
      res.status(500).json({ error: 'Failed to calculate fiscal pipeline data' });
    }
  });

  // Lightweight close rate endpoint (protected)  
  app.get("/api/analytics/close-rate", isAuthenticated, requirePermission('sales'), async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      // Get the most recent snapshot date efficiently
      const latestSnapshotResult = await db.select({ 
        maxDate: sql<string>`MAX(DATE(${snapshots.snapshotDate}))` 
      }).from(snapshots);
      
      const latestSnapshotDate = latestSnapshotResult[0]?.maxDate 
        ? new Date(latestSnapshotResult[0].maxDate + 'T00:00:00.000Z')
        : new Date(0);
      
      // Query only latest snapshots for close rate calculation
      const latestSnapshots = await db.select().from(snapshots)
        .where(sql`DATE(${snapshots.snapshotDate}) = ${latestSnapshotDate.toISOString().split('T')[0]}`);

      // Filter opportunities that entered pipeline in date range
      let eligibleOpportunities = latestSnapshots.filter(snapshot => {
        if (!snapshot.enteredPipeline) return false;
        
        if (startDate && endDate) {
          const enteredDate = new Date(snapshot.enteredPipeline);
          return enteredDate >= new Date(startDate) && enteredDate <= new Date(endDate);
        }
        return true;
      });
      
      // Exclude validation stage
      eligibleOpportunities = eligibleOpportunities.filter(s => 
        s.stage !== 'Validation/Introduction'
      );
      
      const closedWon = eligibleOpportunities.filter(s => s.stage === 'Closed Won').length;
      const totalEligible = eligibleOpportunities.length;
      
      const closeRate = totalEligible > 0 ? (closedWon / totalEligible) * 100 : 0;
      
      res.json({ 
        closeRate: parseFloat(closeRate.toFixed(1)),
        closedWon,
        totalEligible
      });
    } catch (error) {
      console.error('❌ Error calculating close rate:', error);
      res.status(500).json({ error: 'Failed to calculate close rate' });
    }
  });

  // Get pipeline analytics (protected)
  app.get('/api/analytics', isAuthenticated, requirePermission('pipeline'), async (req, res) => {
    try {
      // Get date range from query parameters
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      const pipelineValueByDate = await storage.getPipelineValueByDate(startDate, endDate);
      const stageDistribution = await storage.getStageDistribution();
      const year1ArrDistribution = await storage.getYear1ArrDistribution();
      const fiscalYearPipeline = await storage.getFiscalYearPipeline();
      const fiscalQuarterPipeline = await storage.getFiscalQuarterPipeline();
      const monthlyPipeline = await storage.getMonthlyPipeline();
      
      let movementDays = 30; // Default to 30 days
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        movementDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        movementDays = Math.max(1, Math.min(365, movementDays)); // Limit between 1 and 365 days
      }
      
      const recentMovements = await storage.getDealMovements(movementDays);
      
      console.log(`📊 Analytics: Found ${recentMovements.length} recent movements`);
      if (recentMovements.length > 0) {
        console.log('🔄 Sample movements:', recentMovements.slice(0, 3));
      }
      
      // Debug: Log stage distribution
      console.log('📊 Stage Distribution:', stageDistribution.map(s => ({ stage: s.stage, count: s.count, value: s.value })));
      
      // Calculate metrics - filter out closed and validation stages
      const activeStages = stageDistribution.filter(stage => 
        !stage.stage.includes('Closed Won') && 
        !stage.stage.includes('Closed Lost') && 
        !stage.stage.includes('Validation/Introduction')
      );
      
      console.log('📊 Active Stages After Filter:', activeStages.map(s => ({ stage: s.stage, count: s.count, value: s.value })));
      
      const totalValue = activeStages.reduce((sum, stage) => sum + stage.value, 0);
      const activeCount = activeStages.reduce((sum, stage) => sum + stage.count, 0);
      
      // Initialize avgDealSize - will be calculated after Year 1 ARR data is available
      let avgDealSize = 0;

      // Calculate win rate from closed deals - find the right date range based on actual data
      let conversionRate = 0;
      
      // Get all snapshots to find deals that closed
      const allSnapshotsForWinRate = await storage.getAllSnapshots();
      
      // First, let's see what stage names we have
      const uniqueStages = new Set();
      allSnapshotsForWinRate.forEach(snapshot => {
        if (snapshot.stage) {
          uniqueStages.add(snapshot.stage);
        }
      });
      console.log(`🗓️ All unique stages in data:`, Array.from(uniqueStages).sort());
      
      // Look for closed deals with various possible stage names
      const allClosedSnapshots = allSnapshotsForWinRate.filter(snapshot => {
        if (!snapshot.stage) return false;
        const stage = snapshot.stage.toLowerCase();
        return stage.includes('closed') || stage.includes('won') || stage.includes('lost');
      });
      
      console.log(`🗓️ Found ${allClosedSnapshots.length} total closed deal snapshots`);
      
      if (allClosedSnapshots.length > 0) {
        // Check what close date information we have
        const snapshotsWithCloseDates = allClosedSnapshots.filter(s => s.expectedCloseDate);
        console.log(`🗓️ Snapshots with close dates: ${snapshotsWithCloseDates.length} out of ${allClosedSnapshots.length}`);
        
        if (snapshotsWithCloseDates.length > 0) {
          // Show date range of actual close dates
          const closeDates = snapshotsWithCloseDates.map(s => new Date(s.expectedCloseDate!));
          const minDate = new Date(Math.min(...closeDates.map(d => d.getTime())));
          const maxDate = new Date(Math.max(...closeDates.map(d => d.getTime())));
          console.log(`🗓️ Actual close date range: ${minDate.toISOString().split('T')[0]} to ${maxDate.toISOString().split('T')[0]}`);
          
          // Count closed deals by month using actual close dates
          const monthCounts = new Map();
          snapshotsWithCloseDates.forEach(snapshot => {
            const date = new Date(snapshot.expectedCloseDate!);
            const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
          });
          
          console.log(`🗓️ Closed deals by actual close month:`, Object.fromEntries(monthCounts));
        } else {
          // Fallback to snapshot dates
          const closeDates = allClosedSnapshots.map(s => new Date(s.snapshotDate));
          const minDate = new Date(Math.min(...closeDates.map(d => d.getTime())));
          const maxDate = new Date(Math.max(...closeDates.map(d => d.getTime())));
          console.log(`🗓️ Snapshot date range: ${minDate.toISOString().split('T')[0]} to ${maxDate.toISOString().split('T')[0]}`);
        }
      }
      
      // Use provided date range or fall back to current fiscal year
      let dateRangeStart, dateRangeEnd;
      if (startDate && endDate) {
        dateRangeStart = new Date(startDate);
        dateRangeEnd = new Date(endDate);
        console.log(`🗓️ Using provided date range for win rate: ${dateRangeStart.toISOString().split('T')[0]} to ${dateRangeEnd.toISOString().split('T')[0]}`);
      } else {
        // Fall back to current fiscal year (Feb 1, 2025 - Jan 31, 2026)
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        
        // Determine fiscal year boundaries (Feb 1 - Jan 31)
        if (currentDate.getMonth() >= 1) { // February (1) or later
          dateRangeStart = new Date(currentYear, 1, 1); // Feb 1 of current year
          dateRangeEnd = new Date(currentYear + 1, 0, 31); // Jan 31 of next year
        } else { // January
          dateRangeStart = new Date(currentYear - 1, 1, 1); // Feb 1 of previous year
          dateRangeEnd = new Date(currentYear, 0, 31); // Jan 31 of current year
        }
        console.log(`🗓️ Using default fiscal year for win rate: ${dateRangeStart.toISOString().split('T')[0]} to ${dateRangeEnd.toISOString().split('T')[0]}`);
      }
      
      // Get the most recent snapshot date to filter closed deals
      const latestDateResult = await storage.getAllSnapshots();
      const latestSnapshotDateForWinRate = latestDateResult.length > 0 
        ? new Date(Math.max(...latestDateResult.map(s => new Date(s.snapshotDate).getTime())))
        : null;
      
      if (!latestSnapshotDateForWinRate) {
        console.log('📊 No snapshot data found for win rate calculation');
        conversionRate = 0;
      } else {
        const latestDateStr = latestSnapshotDateForWinRate.toISOString().split('T')[0];
        console.log(`📊 Using latest snapshot date for win rate: ${latestDateStr}`);
        
        // Filter closed deals to only those from the most recent snapshot date AND within date range
        const latestClosedSnapshots = allClosedSnapshots.filter(snapshot => {
          const snapshotDateStr = new Date(snapshot.snapshotDate).toISOString().split('T')[0];
          const closeDate = snapshot.expectedCloseDate ? new Date(snapshot.expectedCloseDate) : new Date(snapshot.snapshotDate);
          const isInDateRange = closeDate >= dateRangeStart && closeDate <= dateRangeEnd;
          const hasEnteredPipeline = snapshot.enteredPipeline !== null && snapshot.enteredPipeline !== undefined;
          
          // Apply filters: latest snapshot, date range, and must have entered pipeline date
          return snapshotDateStr === latestDateStr && isInDateRange && hasEnteredPipeline;
        });
        
        console.log(`📊 Found ${latestClosedSnapshots.length} closed snapshots in latest snapshot (with entered_pipeline filter applied)`);
        
        // Debug: show entered pipeline status for closed deals
        const allLatestClosed = allClosedSnapshots.filter(snapshot => {
          const snapshotDateStr = new Date(snapshot.snapshotDate).toISOString().split('T')[0];
          const closeDate = snapshot.expectedCloseDate ? new Date(snapshot.expectedCloseDate) : new Date(snapshot.snapshotDate);
          const isInDateRange = closeDate >= dateRangeStart && closeDate <= dateRangeEnd;
          return snapshotDateStr === latestDateStr && isInDateRange;
        });
        
        console.log(`📊 Debug: ${allLatestClosed.length} total fiscal year closed deals in latest snapshot`);
        const withPipeline = allLatestClosed.filter(s => s.enteredPipeline !== null && s.enteredPipeline !== undefined).length;
        const withoutPipeline = allLatestClosed.length - withPipeline;
        console.log(`📊 Debug: ${withPipeline} with entered pipeline (included), ${withoutPipeline} without entered pipeline (excluded)`);
        
        // Count unique opportunities that are closed in the latest snapshot (already filtered for entered_pipeline)
        const closedOpportunities = new Map();
        for (const snapshot of latestClosedSnapshots) {
          const opportunityId = snapshot.opportunityId;
          if (opportunityId) {
            closedOpportunities.set(opportunityId, snapshot);
          }
        }
        
        console.log(`📊 Unique closed opportunities after entered_pipeline filter: ${closedOpportunities.size}`);
        
        // Identify opportunities that closed and reopened in the same fiscal year
        // These should be excluded from win rate calculation
        const closedAndReopenedOpportunities = new Set();
        
        // Get all snapshots from latest date to find active opportunities
        const allLatestSnapshots = allSnapshotsForWinRate.filter(snapshot => {
          const snapshotDateStr = new Date(snapshot.snapshotDate).toISOString().split('T')[0];
          return snapshotDateStr === latestDateStr;
        });
        
        // Find active opportunities in latest snapshot
        const activeOpportunities = new Set();
        allLatestSnapshots.forEach(snapshot => {
          if (snapshot.opportunityId && snapshot.stage && 
              !snapshot.stage.toLowerCase().includes('closed') &&
              !snapshot.stage.toLowerCase().includes('validation')) {
            activeOpportunities.add(snapshot.opportunityId);
          }
        });
        
        // Group by account name to find clients with both closed and active opportunities
        const accountOpportunities = new Map();
        allLatestSnapshots.forEach(snapshot => {
          if (snapshot.accountName && snapshot.opportunityId) {
            if (!accountOpportunities.has(snapshot.accountName)) {
              accountOpportunities.set(snapshot.accountName, { closed: new Set(), active: new Set() });
            }
            
            const account = accountOpportunities.get(snapshot.accountName);
            if (snapshot.stage && snapshot.stage.toLowerCase().includes('closed')) {
              // Check if this closed deal is in date range
              const closeDate = snapshot.expectedCloseDate ? new Date(snapshot.expectedCloseDate) : new Date(snapshot.snapshotDate);
              if (closeDate >= dateRangeStart && closeDate <= dateRangeEnd) {
                account.closed.add(snapshot.opportunityId);
              }
            } else if (snapshot.stage && 
                      !snapshot.stage.toLowerCase().includes('closed') &&
                      !snapshot.stage.toLowerCase().includes('validation')) {
              account.active.add(snapshot.opportunityId);
            }
          }
        });
        
        // Identify opportunities from accounts that have both closed and active deals
        // Only the closed opportunities from mixed-state accounts are permanently excluded
        let excludedFromWinRate = 0;
        accountOpportunities.forEach((opportunities, accountName) => {
          if (opportunities.closed.size > 0 && opportunities.active.size > 0) {
            // This account has both closed and active opportunities - exclude only the CLOSED ones permanently
            opportunities.closed.forEach((oppId: number) => {
              closedAndReopenedOpportunities.add(oppId);
              excludedFromWinRate++;
            });
            console.log(`📊 Permanently excluding ${opportunities.closed.size} closed opportunities for ${accountName} (has ${opportunities.active.size} active)`);
          }
        });
        
        console.log(`📊 Total opportunities excluded from win rate (closed + reopened): ${excludedFromWinRate}`);
        
        // Calculate win rate excluding permanently excluded opportunities
        let wonCount = 0;
        let lostCount = 0;
        
        closedOpportunities.forEach((snapshot, oppId) => {
          const stage = snapshot.stage?.toLowerCase() || '';
          const isPermanentlyExcluded = closedAndReopenedOpportunities.has(oppId);
          
          if (stage.includes('closed won') || stage.includes('won')) {
            // Won deals: Count unless permanently excluded
            if (!isPermanentlyExcluded) {
              wonCount++;
            }
          } else if (stage.includes('closed lost') || stage.includes('lost')) {
            // Lost deals: Count unless permanently excluded
            if (!isPermanentlyExcluded) {
              lostCount++;
            }
          }
        });
        
        const totalClosedCount = wonCount + lostCount;
        
        console.log(`📊 Latest snapshot win rate calculation: ${wonCount} won, ${lostCount} lost, ${totalClosedCount} total unique opportunities closed`);
        
        conversionRate = totalClosedCount > 0 ? (wonCount / totalClosedCount) * 100 : 0;
        console.log(`📈 Calculated latest snapshot win rate: ${conversionRate.toFixed(1)}%`);
      }

      // Calculate Total Contract Value from TCV stage distribution
      const totalContractValue = activeStages.reduce((sum, stage) => {
        return sum + stage.value;
      }, 0);
      
      // Calculate Total Year 1 ARR from Year 1 ARR stage distribution
      const activeYear1ArrStages = year1ArrDistribution.filter(stage => 
        !stage.stage.includes('Closed Won') && 
        !stage.stage.includes('Closed Lost') && 
        !stage.stage.includes('Validation/Introduction')
      );
      
      const totalYear1Arr = activeYear1ArrStages.reduce((sum, stage) => {
        return sum + stage.value;
      }, 0);
      
      // Calculate pipeline average deal size using Year 1 ARR values instead of TCV
      const avgDealSizePipeline = activeCount > 0 ? totalYear1Arr / activeCount : 0;
      
      // Calculate closed won average deal size for current fiscal year
      let avgDealSizeClosedWon = 0;
      if (latestSnapshotDateForWinRate) {
        const latestDateStr = latestSnapshotDateForWinRate.toISOString().split('T')[0];
        
        // Get closed won deals from fiscal year
        const closedWonSnapshots = allClosedSnapshots.filter(snapshot => {
          const snapshotDateStr = new Date(snapshot.snapshotDate).toISOString().split('T')[0];
          const closeDate = snapshot.expectedCloseDate ? new Date(snapshot.expectedCloseDate) : new Date(snapshot.snapshotDate);
          const isInDateRange = closeDate >= dateRangeStart && closeDate <= dateRangeEnd;
          const isWon = snapshot.stage && (snapshot.stage.toLowerCase().includes('closed won') || snapshot.stage.toLowerCase().includes('won'));
          
          return snapshotDateStr === latestDateStr && isInDateRange && isWon;
        });
        
        // Calculate average from unique opportunities (avoid double counting)
        const wonOpportunityValues = new Map();
        closedWonSnapshots.forEach(snapshot => {
          if (snapshot.opportunityId && snapshot.year1Value) {
            wonOpportunityValues.set(snapshot.opportunityId, snapshot.year1Value);
          }
        });
        
        if (wonOpportunityValues.size > 0) {
          const totalWonValue = Array.from(wonOpportunityValues.values()).reduce((sum, value) => sum + value, 0);
          avgDealSizeClosedWon = totalWonValue / wonOpportunityValues.size;
        }
        
        console.log(`💰 Found ${wonOpportunityValues.size} unique closed won deals in fiscal year`);
        console.log(`💰 Calculated Avg Deal Size (Closed Won): $${avgDealSizeClosedWon.toLocaleString()}`);
      }
      
      console.log(`💰 Calculated TCV from active stages: $${totalContractValue.toLocaleString()}`);
      console.log(`💰 Calculated Year 1 ARR from active stages: $${totalYear1Arr.toLocaleString()}`);
      console.log(`💰 Calculated Avg Deal Size (Pipeline): $${avgDealSizePipeline.toLocaleString()}`);

      // Calculate Close Rate using provided date range
      let closeRate = 0;
      
      if (latestSnapshotDateForWinRate) {
        const latestDateStr = latestSnapshotDateForWinRate.toISOString().split('T')[0];
        
        // Use the same date range as win rate calculation
        console.log(`📊 Close Rate calculation: ${dateRangeStart.toISOString().split('T')[0]} to ${dateRangeEnd.toISOString().split('T')[0]}`);
        
        // Get opportunities from current snapshot only, excluding Validation stage
        const currentSnapshotForCloseRate = allSnapshotsForWinRate.filter(snapshot => {
          const snapshotDateStr = new Date(snapshot.snapshotDate).toISOString().split('T')[0];
          return snapshotDateStr === latestDateStr && 
                 snapshot.opportunityId && 
                 snapshot.stage &&
                 !snapshot.stage.toLowerCase().includes('validation');
        });
        
        // Get opportunity IDs from current snapshot (non-validation)
        const currentOpportunityIds = new Set(currentSnapshotForCloseRate.map(s => s.opportunityId));
        
        // Filter to opportunities that entered pipeline in the provided date range
        // Use entered_pipeline if available, otherwise fall back to created date
        const opportunitiesInWindowBeyondValidation: Opportunity[] = [];
        const processedOpportunityIds = new Set<number>();
        
        for (const snapshot of currentSnapshotForCloseRate) {
          if (snapshot.opportunityId && !processedOpportunityIds.has(snapshot.opportunityId)) {
            const opportunity = await storage.opportunitiesStorage.getOpportunity(snapshot.opportunityId);
            
            if (opportunity) {
              // Use entered_pipeline if available, otherwise fall back to created date
              let entryDate: Date | null = null;
              if (snapshot.enteredPipeline) {
                entryDate = new Date(snapshot.enteredPipeline);
              } else if (opportunity.createdDate) {
                entryDate = new Date(opportunity.createdDate);
              }
              
              if (entryDate) {
                const inTimeWindow = entryDate >= dateRangeStart && entryDate <= dateRangeEnd;
                
                if (inTimeWindow) {
                  opportunitiesInWindowBeyondValidation.push(opportunity);
                  processedOpportunityIds.add(snapshot.opportunityId);
                }
              }
            }
          }
        }
        
        console.log(`📊 Found ${currentSnapshotForCloseRate.length} opportunities in current snapshot (excluding Validation)`);
        console.log(`📊 Found ${opportunitiesInWindowBeyondValidation.length} opportunities that entered pipeline in date range and in current snapshot`);
        
        // Debug: Show sample opportunities that entered pipeline in range
        console.log(`📊 DEBUG: Sample opportunities that entered pipeline in date range:`);
        opportunitiesInWindowBeyondValidation.slice(0, 5).forEach(opp => {
          const snapshot = currentSnapshotForCloseRate.find(s => s.opportunityId === opp.id);
          let entryDateStr = 'Unknown';
          if (snapshot?.enteredPipeline) {
            entryDateStr = new Date(snapshot.enteredPipeline).toDateString();
          } else if (opp.createdDate) {
            entryDateStr = new Date(opp.createdDate).toDateString() + ' (created)';
          }
          console.log(`  - ${opp.name} (ID: ${opp.id}) entered: ${entryDateStr}`);
        });
        
        if (opportunitiesInWindowBeyondValidation.length > 0) {
          // Use the current snapshot data we already filtered
          const latestSnapshotsForCloseRate = currentSnapshotForCloseRate.filter(snapshot =>
            opportunitiesInWindowBeyondValidation.some(opp => opp.id === snapshot.opportunityId)
          );
          
          // Count closed won deals in the time window
          const closedWonInWindow = latestSnapshotsForCloseRate.filter(snapshot => {
            const stage = snapshot.stage?.toLowerCase() || '';
            return (stage.includes('closed won') || stage.includes('won'));
          });
          
          // Exclude opportunities that are from accounts with both closed and active deals (same logic as Win Rate)
          const accountOpportunitiesForCloseRate = new Map();
          latestSnapshotsForCloseRate.forEach(snapshot => {
            if (snapshot.accountName && snapshot.opportunityId) {
              if (!accountOpportunitiesForCloseRate.has(snapshot.accountName)) {
                accountOpportunitiesForCloseRate.set(snapshot.accountName, { closed: new Set(), active: new Set() });
              }
              
              const account = accountOpportunitiesForCloseRate.get(snapshot.accountName);
              if (snapshot.stage && snapshot.stage.toLowerCase().includes('closed')) {
                account.closed.add(snapshot.opportunityId);
              } else if (snapshot.stage && 
                        !snapshot.stage.toLowerCase().includes('closed') &&
                        !snapshot.stage.toLowerCase().includes('validation')) {
                account.active.add(snapshot.opportunityId);
              }
            }
          });
          
          // Identify opportunities to exclude from close rate (same logic as Win Rate)
          const excludedFromCloseRate = new Set();
          accountOpportunitiesForCloseRate.forEach((opportunities, accountName) => {
            if (opportunities.closed.size > 0 && opportunities.active.size > 0) {
              opportunities.closed.forEach((oppId: number) => {
                excludedFromCloseRate.add(oppId);
              });
            }
          });
          
          // Count valid closed won deals
          const validClosedWonCount = closedWonInWindow.filter(snapshot => 
            !excludedFromCloseRate.has(snapshot.opportunityId!)
          ).length;
          
          closeRate = (validClosedWonCount / opportunitiesInWindowBeyondValidation.length) * 100;
          
          console.log(`📊 Close Rate calculation: ${validClosedWonCount} closed won out of ${opportunitiesInWindowBeyondValidation.length} opportunities (beyond Validation) = ${closeRate.toFixed(1)}%`);
          console.log(`📊 DEBUG: Total closed won found: ${closedWonInWindow.length}, Excluded: ${closedWonInWindow.length - validClosedWonCount}, Valid: ${validClosedWonCount}`);
          console.log(`📊 DEBUG: Excluded opportunity count from close rate: ${excludedFromCloseRate.size}`);
        }
      }

      res.json({
        metrics: {
          totalValue,
          activeCount,
          avgDealSize: avgDealSizePipeline, // Keep existing field name for backward compatibility
          avgDealSizePipeline,
          avgDealSizeClosedWon,
          conversionRate,
          closeRate,
          totalContractValue,
          totalYear1Arr
        },
        pipelineValueByDate,
        stageDistribution,
        fiscalYearPipeline,
        fiscalQuarterPipeline,
        monthlyPipeline,
        recentMovements
      });
    } catch (error) {
      res.status(500).json({ 
        message: 'Failed to fetch analytics', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Stage timing endpoint
  app.get("/api/stage-timing", async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      const stageTimingData = await storage.getStageTimingData(startDate, endDate);
      res.json(stageTimingData);
    } catch (error) {
      console.error("❌ Error fetching stage timing data:", error);
      res.status(500).json({ error: "Failed to fetch stage timing data" });
    }
  });



  // Closed Won FY to Date endpoint (protected)
  app.get("/api/closed-won-fy", isAuthenticated, async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      console.log(`🏆 Closed Won FY API called with date range: ${startDate} to ${endDate}`);
      
      const closedWonData = await storage.getClosedWonFYData(startDate, endDate);
      
      res.json(closedWonData);
    } catch (error) {
      console.error("❌ Error fetching closed won FY data:", error);
      res.status(500).json({ 
        error: "Failed to fetch closed won data",
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Close rate over time endpoint (protected)
  app.get("/api/analytics/close-rate-over-time", isAuthenticated, requirePermission('sales'), async (req, res) => {
    try {
      console.log('🔍 Processing close rate over time analysis');
      
      // Get all snapshots and opportunities for historical analysis
      const allSnapshots = await storage.getAllSnapshots();
      const allOpportunities = await storage.opportunitiesStorage.getAllOpportunities();
      
      // Create opportunity lookup for faster access
      const opportunityMap = new Map();
      allOpportunities.forEach(opp => {
        opportunityMap.set(opp.id, opp);
      });
      
      // Get unique snapshot dates and sort them
      const snapshotDates = Array.from(new Set(allSnapshots.map(s => 
        new Date(s.snapshotDate).toISOString().split('T')[0]
      ))).sort();
      
      console.log(`🔍 Processing ${snapshotDates.length} snapshot dates for close rate analysis`);

      const closeRateData = [];

      for (let i = 0; i < snapshotDates.length; i++) {
        const dateStr = snapshotDates[i];
        const snapshotDate = new Date(dateStr);
        
        // Calculate rolling 12 months date range
        const rolling12StartDate = new Date(snapshotDate);
        rolling12StartDate.setFullYear(rolling12StartDate.getFullYear() - 1);
        
        // Get snapshots for this date
        const dateSnapshots = allSnapshots.filter(s => 
          new Date(s.snapshotDate).toISOString().split('T')[0] === dateStr
        );

        // Calculate rolling 12 months date range for "entered pipeline" filter
        const rolling12EnteredStart = new Date(snapshotDate);
        rolling12EnteredStart.setFullYear(rolling12EnteredStart.getFullYear() - 1);

        // Get opportunities that entered pipeline in rolling 12 months (same as Close Rate card logic)
        // Use entered_pipeline if available, otherwise fall back to created date
        const pipelineEnteredInPeriod = dateSnapshots.filter(s => {
          if (!s.stage) return false;
          
          const stage = s.stage.toLowerCase();
          const isValidStage = !stage.includes('validation') && !stage.includes('introduction');
          if (!isValidStage) return false;
          
          // Use entered_pipeline if available, otherwise fall back to created date from opportunity
          const opp = opportunityMap.get(s.opportunityId);
          if (!opp) return false;
          
          let entryDate: Date | null = null;
          if (s.enteredPipeline) {
            entryDate = new Date(s.enteredPipeline);
          } else if (opp.createdDate) {
            entryDate = new Date(opp.createdDate);
          }
          
          if (!entryDate) return false;
          
          const isInPeriod = entryDate >= rolling12EnteredStart && entryDate <= snapshotDate;
          return isInPeriod;
        });

        // Calculate close rate using same methodology as Close Rate card:
        // Closed Won / (All opportunities that entered pipeline in period)
        const closedWon = pipelineEnteredInPeriod.filter(s => s.stage?.toLowerCase().includes('won')).length;
        const totalInPeriod = pipelineEnteredInPeriod.length;
        
        const closeRate = totalInPeriod > 0 ? (closedWon / totalInPeriod) * 100 : null;

        // Skip data points with no relevant deals or unusually high close rates (>80%)
        if (!closeRate || closeRate > 80) {
          if (closeRate && closeRate > 80) {
            console.log(`🔍 Filtering out data point ${dateStr} with unusually high close rate: ${closeRate.toFixed(1)}%`);
          }
          continue;
        }

        // Get deals that were created or closed in the period between this date and previous date
        let dealsChangedInPeriod: any[] = [];
        
        if (i > 0) {
          const prevDate = new Date(snapshotDates[i - 1]);
          const currentDate = new Date(dateStr);
          
          // Get current snapshot data for this date
          const currentDateSnapshots = allSnapshots.filter(s => 
            new Date(s.snapshotDate).toISOString().split('T')[0] === dateStr
          );
          
          currentDateSnapshots.forEach((snapshot: any) => {
            const opp = opportunityMap.get(snapshot.opportunityId);
            if (!opp) return;
            
            // Check if deal was created in this period
            if (opp.createdDate) {
              const createdDate = new Date(opp.createdDate);
              if (createdDate > prevDate && createdDate <= currentDate) {
                dealsChangedInPeriod.push({
                  name: opp.name || 'Unknown Opportunity',
                  stage: snapshot.stage || 'Unknown',
                  year1Arr: snapshot.amount || 0,
                  closeDate: snapshot.expectedCloseDate ? new Date(snapshot.expectedCloseDate).toISOString().split('T')[0] : 'Unknown',
                  changeType: 'created'
                });
              }
            }
            
            // Check if deal was closed in this period (using close date)
            if (snapshot.expectedCloseDate && snapshot.stage) {
              const closeDate = new Date(snapshot.expectedCloseDate);
              const isClosed = snapshot.stage.toLowerCase().includes('closed') || 
                             snapshot.stage.toLowerCase().includes('won') || 
                             snapshot.stage.toLowerCase().includes('lost');
              
              if (isClosed && closeDate > prevDate && closeDate <= currentDate) {
                dealsChangedInPeriod.push({
                  name: opp.name || 'Unknown Opportunity',
                  stage: snapshot.stage || 'Unknown',
                  year1Arr: snapshot.amount || 0,
                  closeDate: new Date(snapshot.expectedCloseDate).toISOString().split('T')[0],
                  changeType: 'closed'
                });
              }
            }
          });
        }
        
        const closedDeals = dealsChangedInPeriod;
        
        // Debug the new approach for recent dates
        if (i >= snapshotDates.length - 3) {
          console.log(`🔍 DEBUG New Period changes for ${dateStr}:`);
          console.log(`  Previous date: ${i > 0 ? snapshotDates[i - 1] : 'N/A'}`);
          console.log(`  Deals changed in period: ${dealsChangedInPeriod.length}`);
          if (dealsChangedInPeriod.length > 0) {
            console.log('  Sample changes:', dealsChangedInPeriod.slice(0, 2).map(d => `${d.name} (${d.changeType})`));
          }
        }

        closeRateData.push({
          date: dateStr,
          closeRate: closeRate,
          closedDeals: closedDeals
        });
      }

      console.log(`🔍 Final close rate data summary: ${closeRateData.length} data points`);
      
      if (closeRateData.length > 0) {
        const highestCloseRate = Math.max(...closeRateData.map(d => d.closeRate));
        const highestCloseRateDate = closeRateData.find(d => d.closeRate === highestCloseRate)?.date;
        console.log(`🔍 Highest close rate: ${highestCloseRate.toFixed(1)}% on ${highestCloseRateDate}`);
      }

      // Get current open deals count for the chart subtitle
      // Find latest snapshot date
      const latestDate = snapshotDates[snapshotDates.length - 1];
      const latestSnapshots = allSnapshots.filter(s => 
        new Date(s.snapshotDate).toISOString().split('T')[0] === latestDate
      );
      
      const currentOpenDeals = latestSnapshots.filter((snapshot: any) => {
        if (!snapshot.stage) return false;
        const stage = snapshot.stage.toLowerCase();
        const isOpen = !stage.includes('closed') && !stage.includes('validation') && !stage.includes('introduction');
        return isOpen;
      }).length;

      res.json({ 
        closeRateData,
        currentOpenDeals 
      });
    } catch (error) {
      console.error('❌ Error in close rate over time analysis:', error);
      res.status(500).json({ error: 'Failed to fetch close rate over time data' });
    }
  });

  // Win rate over time endpoint (protected)
  app.get("/api/analytics/win-rate-over-time", isAuthenticated, requirePermission('sales'), async (req, res) => {
    try {
      // Get all snapshots and opportunities for historical analysis
      const allSnapshots = await storage.getAllSnapshots();
      const allOpportunities = await storage.opportunitiesStorage.getAllOpportunities();
      
      // Create opportunity lookup for faster access
      const opportunityMap = new Map();
      allOpportunities.forEach(opp => {
        opportunityMap.set(opp.id, opp);
      });
      
      // Get unique snapshot dates and sort them
      const snapshotDates = Array.from(new Set(allSnapshots.map(s => 
        new Date(s.snapshotDate).toISOString().split('T')[0]
      ))).sort();
      
      // Calculate fiscal year start/end for each date
      const getFiscalYear = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return month >= 1 ? year : year - 1; // FY starts in Feb (month 1)
      };
      
      const getFiscalYearRange = (fiscalYear: number) => {
        return {
          start: new Date(fiscalYear, 1, 1), // Feb 1st
          end: new Date(fiscalYear + 1, 0, 31) // Jan 31st next year
        };
      };
      
      // Calculate win rates for each snapshot date
      const winRateData = [];
      
      console.log(`🔍 Processing ${snapshotDates.length} snapshot dates for win rate analysis`);
      
      for (const dateStr of snapshotDates) {
        const snapshotDate = new Date(dateStr);
        const fiscalYear = getFiscalYear(snapshotDate);
        const fyRange = getFiscalYearRange(fiscalYear);
        
        // Get 12 months rolling window
        const rolling12Start = new Date(snapshotDate);
        rolling12Start.setFullYear(rolling12Start.getFullYear() - 1);
        
        // Get snapshots for this date
        const dateSnapshots = allSnapshots.filter(s => 
          new Date(s.snapshotDate).toISOString().split('T')[0] === dateStr
        );
        
        // Calculate FY to Date win rate
        let fyWinRate = null;
        const fyClosedSnapshots = dateSnapshots.filter(s => {
          if (!s.stage || !s.expectedCloseDate) return false;
          const stage = s.stage.toLowerCase();
          const closeDate = new Date(s.expectedCloseDate);
          const isClosed = stage.includes('closed') || stage.includes('won') || stage.includes('lost');
          const isInFY = closeDate >= fyRange.start && closeDate <= fyRange.end;
          return isClosed && isInFY;
        });
        
        if (fyClosedSnapshots.length > 0) {
          const fyWonCount = fyClosedSnapshots.filter(s => {
            const stage = s.stage?.toLowerCase() || '';
            return stage.includes('closed won') || stage.includes('won');
          }).length;
          fyWinRate = (fyWonCount / fyClosedSnapshots.length) * 100;
        }
        
        // Calculate Rolling 12 Months win rate
        let rolling12WinRate = null;
        const rolling12ClosedSnapshots = dateSnapshots.filter(s => {
          if (!s.stage || !s.expectedCloseDate) return false;
          const stage = s.stage.toLowerCase();
          const closeDate = new Date(s.expectedCloseDate);
          const isClosed = stage.includes('closed') || stage.includes('won') || stage.includes('lost');
          const isInRolling12 = closeDate >= rolling12Start && closeDate <= snapshotDate;
          return isClosed && isInRolling12;
        });
        
        if (rolling12ClosedSnapshots.length > 0) {
          const rolling12WonCount = rolling12ClosedSnapshots.filter(s => {
            const stage = s.stage?.toLowerCase() || '';
            return stage.includes('closed won') || stage.includes('won');
          }).length;
          rolling12WinRate = (rolling12WonCount / rolling12ClosedSnapshots.length) * 100;
        }
        
        // Only add data points if we have at least one win rate calculation
        if (fyWinRate !== null || rolling12WinRate !== null) {
          // Filter out unusually high win rates that are likely data artifacts
          if ((fyWinRate && fyWinRate > 40) || (rolling12WinRate && rolling12WinRate > 40)) {
            console.log(`🔍 Filtering out data point ${dateStr} with unusually high win rate (FY: ${fyWinRate}%, Rolling: ${rolling12WinRate}%)`);
          }
          
          // Get deals that closed between this snapshot date and the previous snapshot date
          const currentIndex = snapshotDates.indexOf(dateStr);
          const previousSnapshotDate = currentIndex > 0 ? snapshotDates[currentIndex - 1] : null;
          
          const fyDealsClosedInPeriod = fyClosedSnapshots.filter(s => {
            if (!s.expectedCloseDate) return false;
            const closeDate = new Date(s.expectedCloseDate);
            const closeDateStr = closeDate.toISOString().split('T')[0];
            
            if (previousSnapshotDate) {
              // Show deals that closed after the previous snapshot date and up to current snapshot date
              return closeDateStr > previousSnapshotDate && closeDateStr <= dateStr;
            } else {
              // For the first snapshot, show deals that closed on or before this date
              return closeDateStr <= dateStr;
            }
          });

          const rolling12DealsClosedInPeriod = rolling12ClosedSnapshots.filter(s => {
            if (!s.expectedCloseDate) return false;
            const closeDate = new Date(s.expectedCloseDate);
            const closeDateStr = closeDate.toISOString().split('T')[0];
            
            if (previousSnapshotDate) {
              // Show deals that closed after the previous snapshot date and up to current snapshot date
              return closeDateStr > previousSnapshotDate && closeDateStr <= dateStr;
            } else {
              // For the first snapshot, show deals that closed on or before this date
              return closeDateStr <= dateStr;
            }
          });

          // Prepare deal details for tooltip - deals that closed in the period between snapshots
          const fyClosedDeals = fyDealsClosedInPeriod.map(s => ({
            name: s.opportunityName || 'Unknown',
            year1Arr: s.amount || 0,
            stage: s.stage || 'Unknown',
            closeDate: s.expectedCloseDate ? new Date(s.expectedCloseDate).toISOString().split('T')[0] : 'Unknown'
          }));
          
          const rolling12ClosedDeals = rolling12DealsClosedInPeriod.map(s => ({
            name: s.opportunityName || 'Unknown',
            year1Arr: s.amount || 0,
            stage: s.stage || 'Unknown',
            closeDate: s.expectedCloseDate ? new Date(s.expectedCloseDate).toISOString().split('T')[0] : 'Unknown'
          }));

          // Add hardcoded note for May 11th, 2025
          const specialNote = dateStr === '2025-05-11' ? 'Entered Pipeline Introduced' : undefined;

          winRateData.push({
            date: dateStr,
            fiscalYear: `FY${fiscalYear + 1}`, // Display as FY2025 for fiscal year 2024
            fyWinRate,
            rolling12WinRate,
            fyClosedDeals,
            rolling12ClosedDeals,
            specialNote, // Add the note field
            // Add debug info for analysis
            fyClosedCount: fyClosedSnapshots.length,
            fyWonCount: fyClosedSnapshots.filter(s => s.stage?.toLowerCase().includes('won')).length,
            rolling12ClosedCount: rolling12ClosedSnapshots.length,
            rolling12WonCount: rolling12ClosedSnapshots.filter(s => s.stage?.toLowerCase().includes('won')).length
          });
        }
      }
      
      // Filter out data points over 40% to avoid artificial spikes (similar to frontend filter)
      const filteredWinRateData = winRateData.filter(point => {
        const fyValid = !point.fyWinRate || point.fyWinRate <= 40;
        const rollingValid = !point.rolling12WinRate || point.rolling12WinRate <= 40;
        return fyValid && rollingValid;
      });

      // Log final result summary
      console.log(`🔍 Final win rate data summary: ${filteredWinRateData.length} data points (${winRateData.length - filteredWinRateData.length} filtered out for being >40%)`);
      if (filteredWinRateData.length > 0) {
        const fyValues = filteredWinRateData.filter(d => d.fyWinRate !== null).map(d => d.fyWinRate!);
        const rolling12Values = filteredWinRateData.filter(d => d.rolling12WinRate !== null).map(d => d.rolling12WinRate!);
        
        if (fyValues.length > 0) {
          const maxFyWinRate = Math.max(...fyValues);
          console.log(`🔍 Highest FY win rate (after filter): ${maxFyWinRate}% on ${filteredWinRateData.find(d => d.fyWinRate === maxFyWinRate)?.date}`);
        }
        
        if (rolling12Values.length > 0) {
          const maxRolling12WinRate = Math.max(...rolling12Values);
          console.log(`🔍 Highest Rolling 12 win rate (after filter): ${maxRolling12WinRate}% on ${filteredWinRateData.find(d => d.rolling12WinRate === maxRolling12WinRate)?.date}`);
        }
      }

      res.json({ winRateData: filteredWinRateData });
    } catch (error) {
      console.error('Error fetching win rate over time:', error);
      res.status(500).json({ error: 'Failed to fetch win rate over time data' });
    }
  });

  // Loss reason analytics endpoint (protected)
  app.get("/api/analytics/loss-reasons", isAuthenticated, requirePermission('sales'), async (req, res) => {
    try {
      console.log("🎯 LOSS REASON OVERVIEW API CALLED ===== startDate:", req.query.startDate, "endDate:", req.query.endDate);
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const lossReasonData = await storage.getLossReasonAnalysis(startDate, endDate);
      console.log("🎯 LOSS REASON OVERVIEW API RETURNING:", lossReasonData?.length || 0, "results");
      res.json(lossReasonData);
    } catch (error) {
      console.error("❌ LOSS REASON OVERVIEW API ERROR:", error);
      res.status(500).json({ error: "Failed to fetch loss reason data" });
    }
  });

  // Loss reason by previous stage endpoint (protected)
  app.get("/api/analytics/loss-reasons-by-previous-stage", isAuthenticated, requirePermission('sales'), async (req, res) => {
    try {
      console.log("🎯 LOSS REASON BY STAGE API CALLED ===== startDate:", req.query.startDate, "endDate:", req.query.endDate);
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const lossReasonByStageData = await storage.getLossReasonByPreviousStage(startDate, endDate);
      console.log("🎯 LOSS REASON BY STAGE API RETURNING:", lossReasonByStageData?.length || 0, "results");
      res.json(lossReasonByStageData);
    } catch (error) {
      console.error("❌ LOSS REASON BY STAGE API ERROR:", error);
      res.status(500).json({ error: "Failed to fetch loss reason by previous stage data" });
    }
  });

  // Date slippage endpoint
  app.get("/api/date-slippage", async (req, res) => {
    try {
      console.log("🔍 Date slippage API endpoint called");
      const dateSlippageData = await storage.getDateSlippageData();
      console.log("🔍 Date slippage API returning:", dateSlippageData?.length || 0, "results");
      res.json(dateSlippageData);
    } catch (error) {
      console.error("❌ Error fetching date slippage data:", error);
      res.status(500).json({ error: "Failed to fetch date slippage data" });
    }
  });

  // Validation analysis endpoint
  app.get("/api/validation-analysis", async (req, res) => {
    try {
      const validationData = await storage.getValidationAnalysis();
      res.json(validationData);
    } catch (error) {
      console.error("❌ Error fetching validation analysis:", error);
      res.status(500).json({ error: "Failed to fetch validation analysis" });
    }
  });

  // Closing probability analysis endpoint
  app.get("/api/closing-probability", async (req, res) => {
    try {
      console.log('🎯 Starting closing probability analysis...');
      const { startDate, endDate } = req.query;
      const probabilityData = await storage.getClosingProbabilityData(
        startDate as string, 
        endDate as string
      );
      console.log('🎯 Probability analysis complete:', probabilityData.length, 'stages analyzed');
      res.json(probabilityData);
    } catch (error) {
      console.error("❌ Error fetching closing probability data:", error);
      res.status(500).json({ error: "Failed to fetch closing probability data" });
    }
  });

  // Duplicate opportunities analysis endpoint
  app.get("/api/duplicate-opportunities", async (req, res) => {
    try {
      const endDate = req.query.endDate as string;
      console.log('🔍 Starting duplicate opportunities analysis for date:', endDate);
      
      const duplicateData = await storage.getDuplicateOpportunities(endDate);
      console.log('🔍 Duplicate analysis complete:', duplicateData.length, 'duplicate groups found');
      res.json(duplicateData);
    } catch (error) {
      console.error("❌ Error fetching duplicate opportunities:", error);
      res.status(500).json({ error: "Failed to fetch duplicate opportunities" });
    }
  });

  // Stage slippage analysis
  app.get('/api/stage-slippage', async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const slippageData = await storage.getStageSlippageAnalysis(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(slippageData);
    } catch (error) {
      console.error("Error fetching stage slippage data:", error);
      res.status(500).json({ error: "Failed to fetch stage slippage data" });
    }
  });

  // Quarter retention analysis
  app.get('/api/quarter-retention', async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const retentionData = await storage.getQuarterRetentionAnalysis(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(retentionData);
    } catch (error) {
      console.error("Error fetching quarter retention data:", error);
      res.status(500).json({ error: "Failed to fetch quarter retention data" });
    }
  });

  // Value changes by stage transition
  app.get('/api/value-changes', async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      let start: Date | undefined;
      let end: Date | undefined;
      
      if (startDate && typeof startDate === 'string') {
        start = new Date(startDate);
      }
      
      if (endDate && typeof endDate === 'string') {
        end = new Date(endDate);
      }
      
      const valueChanges = await storage.getValueChangesByStage(start, end);
      res.json(valueChanges);
    } catch (error) {
      console.error("Error fetching value changes data:", error);
      res.status(500).json({ error: "Failed to fetch value changes data" });
    }
  });

  // Recent losses endpoint
  app.get("/api/recent-losses", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const recentLosses = await storage.getRecentLosses(limit);
      res.json(recentLosses);
    } catch (error) {
      console.error("❌ Error fetching recent losses:", error);
      res.status(500).json({ error: "Failed to fetch recent losses" });
    }
  });

  // Get uploaded files with optional date filtering
  app.get('/api/files', async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      let files;
      if (startDate && endDate) {
        files = await storage.getUploadedFilesByDateRange(
          new Date(startDate as string),
          new Date(endDate as string)
        );
      } else {
        files = await storage.getAllUploadedFiles();
      }
      
      res.json(files);
    } catch (error) {
      res.status(500).json({ 
        message: 'Failed to fetch files', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Delete uploaded file and associated snapshots
  app.delete('/api/files/:id', async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      
      if (isNaN(fileId)) {
        return res.status(400).json({ error: 'Invalid file ID' });
      }

      // Get file info before deletion for response
      const file = await storage.getUploadedFile(fileId);
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Delete all snapshots associated with this file's snapshot date
      await storage.deleteSnapshotsByUploadedFile(fileId);
      
      // Delete the uploaded file record
      await storage.deleteUploadedFile(fileId);
      
      res.json({ 
        message: 'File and associated data deleted successfully',
        deletedFile: file
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ 
        error: 'Failed to delete file',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get snapshots with optional filtering
  app.get('/api/snapshots', async (req, res) => {
    try {
      const { startDate, endDate, account, stage } = req.query;
      
      // Build query dynamically based on filters
      let whereConditions = [];
      
      if (startDate) {
        whereConditions.push(`snapshot_date >= '${startDate}'`);
      }
      if (endDate) {
        whereConditions.push(`snapshot_date <= '${endDate}'`);
      }
      if (account) {
        // Convert to string and escape single quotes to prevent SQL injection
        let accountStr: string;
        if (Array.isArray(account)) {
          accountStr = account[0]?.toString() || '';
        } else {
          accountStr = account.toString();
        }
        const escapedAccount = accountStr.replace(/'/g, "''");
        whereConditions.push(`account_name ILIKE '%${escapedAccount}%'`);
      }
      if (stage) {
        whereConditions.push(`stage ILIKE '%${stage}%'`);
      }
      
      const whereClause = whereConditions.length > 0 ? 
        `WHERE ${whereConditions.join(' AND ')}` : '';
      
      const query = `
        SELECT 
          id,
          opportunity_id,
          snapshot_date,
          stage,
          confidence,
          opportunity_name,
          account_name,
          amount,
          expected_close_date,
          close_date,
          tcv,
          year1_value,
          homes_built,
          stage_duration,
          age
        FROM snapshots 
        ${whereClause}
        ORDER BY snapshot_date DESC, opportunity_name ASC
        LIMIT 1000
      `;
      
      const result = await db.execute(sql.raw(query));
      res.json(result.rows || []);
    } catch (error) {
      console.error('Error fetching snapshots:', error);
      res.status(500).json({ 
        message: 'Failed to fetch snapshots', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Data management endpoints
  app.delete("/api/data/:date", async (req, res) => {
    try {
      const { date } = req.params;
      const snapshotDate = new Date(date);
      
      if (isNaN(snapshotDate.getTime())) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
      }
      
      await storage.clearDataByDate(snapshotDate);
      res.json({ 
        success: true, 
        message: `Data cleared for ${snapshotDate.toISOString().split('T')[0]}` 
      });
    } catch (error) {
      console.error("Error clearing data:", error);
      res.status(500).json({ error: "Failed to clear data" });
    }
  });

  app.delete("/api/data/all", async (req, res) => {
    try {
      await storage.clearAllData();
      res.json({ success: true, message: "All data cleared" });
    } catch (error) {
      console.error("Error clearing all data:", error);
      res.status(500).json({ error: "Failed to clear all data" });
    }
  });

  // Settings endpoints
  app.get("/api/settings/stage-mappings", async (_req, res) => {
    try {
      const mappings = await storage.settingsStorage.getStageMappings();
      res.json({ mappings });
    } catch (error) {
      console.error("Error fetching stage mappings:", error);
      res.status(500).json({ error: "Failed to fetch stage mappings" });
    }
  });

  app.post("/api/settings/stage-mappings", async (req, res) => {
    try {
      const { mappings } = req.body;
      
      // Validate mappings structure
      if (!Array.isArray(mappings)) {
        return res.status(400).json({ error: "Mappings must be an array" });
      }
      
      for (const mapping of mappings) {
        if (!mapping.from || !mapping.to || typeof mapping.from !== 'string' || typeof mapping.to !== 'string') {
          return res.status(400).json({ error: "Each mapping must have 'from' and 'to' string properties" });
        }
      }
      
      await storage.settingsStorage.setStageMappings(mappings);
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving stage mappings:", error);
      res.status(500).json({ error: "Failed to save stage mappings" });
    }
  });

  app.get("/api/settings/probability-configs", async (_req, res) => {
    try {
      const configs = await storage.settingsStorage.getProbabilityConfigs();
      res.json({ configs });
    } catch (error) {
      console.error("Error fetching probability configs:", error);
      res.status(500).json({ error: "Failed to fetch probability configs" });
    }
  });

  app.post("/api/settings/probability-configs", async (req, res) => {
    try {
      const { configs } = req.body;
      
      // Validate configs structure
      if (!Array.isArray(configs)) {
        return res.status(400).json({ error: "Configs must be an array" });
      }
      
      for (const config of configs) {
        if (typeof config.stage !== 'string' || 
            typeof config.confidence !== 'string' || 
            typeof config.probability !== 'number' ||
            config.probability < 0 || config.probability > 100) {
          return res.status(400).json({ error: "Each config must have valid 'stage' (string), 'confidence' (string), and 'probability' (0-100) properties" });
        }
      }
      
      await storage.settingsStorage.setProbabilityConfigs(configs);
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving probability configs:", error);
      res.status(500).json({ error: "Failed to save probability configs" });
    }
  });

  // Clear all data
  app.delete('/api/data', async (req, res) => {
    try {
      await storage.clearAllData();
      console.log('🗑️ All data cleared');
      res.json({ message: 'All data cleared successfully' });
    } catch (error) {
      res.status(500).json({ 
        message: 'Failed to clear data', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Simple direct analytics endpoint - no conflicts
  const { marketingStorage } = await import('./storage-mktg.js');
  
  app.get('/api/marketing/campaigns/:id/analytics', isAuthenticated, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      console.log('🎯 SIMPLE ANALYTICS - Campaign ID:', campaignId);
      
      if (isNaN(campaignId)) {
        return res.status(400).json({ error: 'Invalid campaign ID' });
      }
      
      const analytics = await marketingStorage.getCampaignAnalytics(campaignId);
      console.log('🎯 SIMPLE ANALYTICS - Data:', JSON.stringify(analytics, null, 2));
      res.json(analytics);
    } catch (error) {
      console.error('🎯 SIMPLE ANALYTICS - Error:', error);
      res.status(500).json({ error: 'Failed to fetch campaign analytics' });
    }
  });

  // Marketing graph routes
  const { registerMarketingGraphRoutes } = await import('./routes-mktg.js');
  registerMarketingGraphRoutes(app);

  // Current snapshots for campaign customers
  app.get('/api/marketing/campaigns/:id/current-snapshots', isAuthenticated, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      console.log('📸 CURRENT SNAPSHOTS - Campaign ID:', campaignId);
      
      if (isNaN(campaignId)) {
        return res.status(400).json({ error: 'Invalid campaign ID' });
      }
      
      const currentSnapshots = await marketingStorage.getCurrentSnapshotsForCampaign(campaignId);
      console.log('📸 CURRENT SNAPSHOTS - Data:', JSON.stringify(currentSnapshots, null, 2));
      res.json(currentSnapshots);
    } catch (error) {
      console.error('📸 CURRENT SNAPSHOTS - Error:', error);
      res.status(500).json({ error: 'Failed to fetch current snapshots' });
    }
  });

  // Closed won customers for campaign
  app.get('/api/marketing/campaigns/:id/closed-won-customers', isAuthenticated, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      
      if (isNaN(campaignId)) {
        return res.status(400).json({ error: 'Invalid campaign ID' });
      }
      
      const customers = await marketingStorage.getCampaignClosedWonCustomers(campaignId);
      res.json(customers);
    } catch (error) {
      console.error('Error fetching closed won customers:', error);
      res.status(500).json({ error: 'Failed to fetch closed won customers' });
    }
  });

  // Pipeline customers for campaign
  app.get('/api/marketing/campaigns/:id/pipeline-customers', isAuthenticated, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      
      if (isNaN(campaignId)) {
        return res.status(400).json({ error: 'Invalid campaign ID' });
      }
      
      const customers = await marketingStorage.getCampaignPipelineCustomers(campaignId);
      res.json(customers);
    } catch (error) {
      console.error('Error fetching pipeline customers:', error);
      res.status(500).json({ error: 'Failed to fetch pipeline customers' });
    }
  });

  // Register marketing graph routes first
  try {
    const marketingGraphModule = await import('./routes-mktg.js');
    marketingGraphModule.registerMarketingGraphRoutes(app);
    console.log('✅ Marketing graph routes loaded successfully');
  } catch (error) {
    console.error('❌ Failed to load marketing graph routes:', error);
  }

  // Register marketing routes AFTER our simple analytics
  try {
    const marketingModule = await import('./routes/marketing.js');
    const marketingRouter = marketingModule.default;
    console.log('✅ Marketing routes loaded successfully');
    app.use('/api/marketing', marketingRouter);
  } catch (error) {
    console.error('❌ Failed to load marketing routes:', error);
  }

  const httpServer = createServer(app);
  return httpServer;
}
