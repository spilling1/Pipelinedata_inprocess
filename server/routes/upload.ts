import type { Express } from "express";
import { storage } from "../storage";
import { insertUploadedFileSchema, opportunities, snapshots, uploadedFiles, type Opportunity, type Snapshot } from "@shared/schema";
import { db } from "../db";
import { sql } from "drizzle-orm";
import multer from "multer";
import * as XLSX from "xlsx";
import { z } from "zod";
import { isAuthenticated } from "../localAuthBypass";

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
  const mappings = await storage.getStageMappings();
  
  // Check for dynamic mappings (case-insensitive)
  const mapping = mappings.find((m: any) => m.from.toLowerCase() === trimmedStage.toLowerCase());
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
  
  // Default to row 0 if no clear header found
  return 0;
}

// Helper function to parse CSV data
function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  
  return result;
}

async function parseCSVData(buffer: Buffer, filename: string) {
  const csvText = buffer.toString('utf-8');
  const lines = csvText.split('\n').map(line => line.trim()).filter(line => line);
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }
  
  // Parse headers
  const headers = parseCSVLine(lines[0]);
  console.log('CSV Headers:', headers);
  
  // Parse data rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: any = {};
    
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || '';
    }
    
    rows.push(row);
  }
  
  return {
    headers,
    data: rows,
    filename
  };
}

async function parseExcelData(buffer: Buffer, filename: string) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  console.log('Processing Excel file:', filename);
  console.log('Sheet name:', sheetName);
  
  // Find the header row
  const headerRow = findHeaderRow(worksheet);
  console.log('Header row found at:', headerRow);
  
  // Convert to JSON with header row specification
  const rawData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1,
    range: headerRow,
    defval: null
  }) as any[][];
  
  if (rawData.length === 0) {
    throw new Error('No data found in Excel file');
  }
  
  // Extract headers from the first row
  const headers = rawData[0].map((header: any) => 
    header ? String(header).trim() : ''
  ).filter(Boolean);
  
  console.log('Excel Headers:', headers);
  
  // Process data rows
  const dataRows = rawData.slice(1).filter(row => 
    row && row.some(cell => cell !== null && cell !== undefined && cell !== '')
  );
  
  const processedData = dataRows.map(row => {
    const rowData: any = {};
    headers.forEach((header, index) => {
      const value = row[index];
      rowData[header] = value !== null && value !== undefined ? String(value).trim() : '';
    });
    return rowData;
  });
  
  return {
    headers,
    data: processedData,
    filename
  };
}

async function parseFileData(buffer: Buffer, filename: string) {
  const ext = filename.toLowerCase().split('.').pop();
  
  if (ext === 'csv') {
    return parseCSVData(buffer, filename);
  } else if (ext === 'xlsx' || ext === 'xls') {
    return parseExcelData(buffer, filename);
  } else {
    throw new Error(`Unsupported file type: ${ext}`);
  }
}

export function registerUploadRoutes(app: Express) {
  // File upload endpoint
  app.post('/api/upload', isAuthenticated, upload.array('files'), async (req: any, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }
      
      const results = [];
      
      for (const file of files) {
        console.log(`Processing file: ${file.originalname}`);
        
        try {
          // Extract snapshot date from filename
          const snapshotDate = extractDateFromFilename(file.originalname);
          
          if (!snapshotDate) {
            console.warn(`Could not extract date from filename: ${file.originalname}`);
            results.push({
              filename: file.originalname,
              error: 'Could not extract date from filename. Expected format: *-YYYY-MM-DD-HH-MM-SS.xlsx'
            });
            continue;
          }
          
          console.log(`Extracted snapshot date: ${snapshotDate.toISOString()}`);
          
          // Parse file data
          const { headers, data } = await parseFileData(file.buffer, file.originalname);
          
          console.log(`Found ${data.length} rows with headers:`, headers);
          
          // Save uploaded file record
          const uploadedFile = await storage.filesStorage.createUploadedFile({
            filename: file.originalname,
            snapshotDate,
            recordCount: data.length
          });
          
          console.log(`Created uploaded file record with ID: ${uploadedFile.id}`);
          
          // Process each row
          let processedCount = 0;
          let skippedCount = 0;
          
          for (const row of data) {
            try {
              // Extract opportunity data with flexible column mapping
              const opportunityId = row['Opportunity ID'] || row['OpportunityId'] || row['ID'] || '';
              const opportunityName = row['Opportunity Name'] || row['Name'] || row['Deal Name'] || row['Opportunity'] || '';
              const clientName = row['Account Name'] || row['Client'] || row['Account'] || row['Client Name'] || '';
              const stage = row['Stage'] || row['Sales Stage'] || row['Pipeline Stage'] || '';
              const amount = parseFloat(String(row['Amount'] || row['Value'] || row['Deal Value'] || row['TCV'] || '0').replace(/[,$]/g, '')) || 0;
              const owner = row['Opportunity Owner'] || row['Owner'] || row['Sales Rep'] || row['Rep'] || '';
              const closeDate = row['Close Date'] || row['Expected Close'] || row['Target Close'] || '';
              const probability = parseFloat(String(row['Probability'] || row['Win Probability'] || '0').replace(/%/g, '')) || 0;
              
              // Skip rows without essential data (including opportunity ID)
              if (!opportunityId || !opportunityName || !stage) {
                skippedCount++;
                continue;
              }
              
              // Validate opportunity ID format (should start with '006' for Salesforce)
              if (!opportunityId.startsWith('006')) {
                console.warn(`Skipping row with invalid opportunity ID format: ${opportunityId}`);
                skippedCount++;
                continue;
              }
              
              // Normalize stage name
              const normalizedStage = await normalizeStage(stage);
              
              // Parse close date
              let parsedCloseDate: Date | null = null;
              if (closeDate) {
                const date = new Date(closeDate);
                if (!isNaN(date.getTime())) {
                  parsedCloseDate = date;
                }
              }
              
              // Create or update opportunity
              let opportunity = await storage.getOpportunityById(opportunityId);
              
              if (!opportunity) {
                opportunity = await storage.createOpportunity({
                  name: opportunityName,
                  clientName: clientName || null,
                  opportunityId: opportunityId
                });
              }
              
              // Create snapshot
              await storage.createSnapshot({
                opportunityId: opportunity.id,
                snapshotDate,
                stage: normalizedStage,
                amount,
                probability,
                owner: owner || null,
                closeDate: parsedCloseDate,
                uploadedFileId: uploadedFile.id,
                opportunityName,
                clientName: clientName || null,
                tcv: amount, // Use amount as TCV for now
                year1Value: null,
                homesBuilt: null,
                stageDuration: null,
                age: null
              });
              
              processedCount++;
            } catch (rowError) {
              console.error('Error processing row:', rowError);
              skippedCount++;
            }
          }
          
          results.push({
            filename: file.originalname,
            snapshotDate: snapshotDate.toISOString(),
            totalRows: data.length,
            processedRows: processedCount,
            skippedRows: skippedCount,
            uploadedFileId: uploadedFile.id
          });
          
          console.log(`✅ Processed ${file.originalname}: ${processedCount} rows processed, ${skippedCount} skipped`);
          
        } catch (fileError) {
          console.error(`Error processing file ${file.originalname}:`, fileError);
          results.push({
            filename: file.originalname,
            error: fileError instanceof Error ? fileError.message : 'Unknown error occurred'
          });
        }
      }
      
      res.json({
        success: true,
        message: `Processed ${files.length} file(s)`,
        results
      });
      
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get uploaded files
  app.get('/api/files', async (req, res) => {
    try {
      const files = await storage.getAllUploadedFiles();
      res.json(files);
    } catch (error) {
      console.error('Error fetching files:', error);
      res.status(500).json({ 
        error: 'Failed to fetch files',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}