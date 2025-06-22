import * as XLSX from 'xlsx';

export interface ParsedOpportunity {
  opportunityId: string;
  opportunityName: string;
  clientName?: string;
  owner?: string;
  createdDate?: Date;
  stage: string;
  amount: number;
  expectedCloseDate?: Date;
  lastModified?: Date;
  enteredPipeline?: Date;
  snapshotDate: Date;
}

export function extractDateFromFilename(filename: string): Date | null {
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

export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export function findHeaderRow(worksheet: XLSX.WorkSheet): number {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
  
  for (let row = range.s.r; row <= Math.min(range.e.r, 10); row++) {
    const cellA = worksheet[XLSX.utils.encode_cell({ r: row, c: 0 })];
    const cellB = worksheet[XLSX.utils.encode_cell({ r: row, c: 1 })];
    
    if (cellA && cellB) {
      const textA = cellA.v?.toString().toLowerCase() || '';
      const textB = cellB.v?.toString().toLowerCase() || '';
      
      if (textA.includes('opportunity') || textA.includes('deal') || 
          textB.includes('stage') || textB.includes('value')) {
        return row;
      }
    }
  }
  
  return 4; // Default to row 5 (0-indexed row 4) if not found
}

export function parseExcelFile(buffer: ArrayBuffer, filename: string): ParsedOpportunity[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
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

  const processedData: ParsedOpportunity[] = [];
  
  for (const row of rawData) {
    if (!row || typeof row !== 'object') continue;
    
    const normalizedRow: any = {};
    
    // Normalize all headers
    for (const [key, value] of Object.entries(row as Record<string, any>)) {
      const normalizedKey = normalizeHeader(key);
      normalizedRow[normalizedKey] = value;
    }

    // Skip empty rows
    if (!normalizedRow.opportunity_name && !normalizedRow.deal_name && !normalizedRow.name) {
      continue;
    }

    // Map common field variations
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

    const amount = normalizedRow.year1_value || 
                   normalizedRow.y1_value ||
                   normalizedRow.first_year_value ||
                   normalizedRow.year_1_platform_fee ||
                   normalizedRow.expected_revenue || 
                   normalizedRow.value || 
                   normalizedRow.deal_value ||
                   normalizedRow.blended_arr ||
                   0;

    const stage = normalizedRow.stage || 
                  normalizedRow.pipeline_stage || 
                  normalizedRow.sales_stage ||
                  'Unknown';

    const owner = normalizedRow.owner || 
                  normalizedRow.deal_owner || 
                  normalizedRow.account_owner ||
                  undefined;

    const clientName = normalizedRow.client_name || 
                       normalizedRow.account_name || 
                       normalizedRow.company ||
                       undefined;

    // Parse dates - timezone agnostic using UTC
    const parseDate = (dateValue: any): Date | undefined => {
      if (!dateValue) return undefined;
      if (dateValue instanceof Date) return dateValue;
      if (typeof dateValue === 'number') {
        // Excel date serial number - convert to UTC
        const utcTime = (dateValue - 25569) * 86400 * 1000;
        return new Date(utcTime);
      }
      if (typeof dateValue === 'string') {
        // Parse string dates and normalize to UTC
        const parsed = new Date(dateValue);
        if (isNaN(parsed.getTime())) return undefined;
        
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
      return undefined;
    };

    const expectedCloseDate = parseDate(normalizedRow.expected_close_date || 
                                       normalizedRow.close_date ||
                                       normalizedRow.projected_close);
    
    const createdDate = parseDate(normalizedRow.created_date ||
                                  normalizedRow.date_created);
    
    const lastModified = parseDate(normalizedRow.last_modified ||
                                   normalizedRow.modified_date);
    
    const enteredPipeline = parseDate(normalizedRow.entered_pipeline ||
                                     normalizedRow.pipeline_entry_date);

    processedData.push({
      opportunityId,
      opportunityName,
      clientName,
      owner,
      createdDate,
      stage,
      amount: typeof amount === 'number' ? amount : parseFloat(amount) || 0,
      expectedCloseDate,
      lastModified,
      enteredPipeline,
      snapshotDate
    });
  }

  return processedData;
}
