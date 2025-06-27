/**
 * Utility functions for file processing and parsing
 */

// Helper function to extract date from filename
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

// Helper function to normalize column headers
export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

// Helper function to parse a CSV line with proper quote handling
export function parseCSVLine(line: string): string[] {
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