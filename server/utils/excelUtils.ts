import * as XLSX from "xlsx";
import { extractDateFromFilename, normalizeHeader } from "./fileUtils";
import { storage } from "../storage";

// Helper function to normalize stage names using dynamic mappings
export async function normalizeStage(stage: string): Promise<string> {
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
export function findHeaderRow(worksheet: XLSX.WorkSheet): number {
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