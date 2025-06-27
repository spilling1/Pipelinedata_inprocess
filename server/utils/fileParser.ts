import { parseCSVData } from "./csvParser";
import { parseExcelData } from "./excelParser";

// Generic file parser that handles both Excel and CSV
export async function parseFileData(buffer: Buffer, filename: string) {
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