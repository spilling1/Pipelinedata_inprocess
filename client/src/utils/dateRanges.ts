export interface DateRangeOption {
  label: string;
  value: string;
  getDateRange: () => { startDate: Date; endDate: Date };
}

export const dateRangeOptions: DateRangeOption[] = [
  {
    label: "Last 1 Month",
    value: "last-1-month",
    getDateRange: () => {
      const now = new Date();
      const startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 1);
      return { startDate, endDate: now };
    }
  },
  {
    label: "Last 3 Months",
    value: "last-3-months",
    getDateRange: () => {
      const now = new Date();
      const startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 3);
      return { startDate, endDate: now };
    }
  },
  {
    label: "Last 6 Months",
    value: "last-6-months",
    getDateRange: () => {
      const now = new Date();
      const startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 6);
      return { startDate, endDate: now };
    }
  },
  {
    label: "Last 12 Months",
    value: "last-12-months",
    getDateRange: () => {
      const now = new Date();
      const startDate = new Date(now);
      startDate.setFullYear(startDate.getFullYear() - 1);
      return { startDate, endDate: now };
    }
  },
  {
    label: "Month to Date",
    value: "month-to-date",
    getDateRange: () => {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate, endDate: now };
    }
  },
  {
    label: "FQ to Date",
    value: "fq-to-date",
    getDateRange: () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-based
      
      // Fiscal quarters start in Feb, May, Aug, Nov
      let fiscalQuarterStart: Date;
      if (currentMonth >= 1 && currentMonth <= 4) { // Feb-May
        fiscalQuarterStart = new Date(currentYear, 1, 1); // Feb 1
      } else if (currentMonth >= 5 && currentMonth <= 7) { // Jun-Aug
        fiscalQuarterStart = new Date(currentYear, 4, 1); // May 1
      } else if (currentMonth >= 8 && currentMonth <= 10) { // Sep-Nov
        fiscalQuarterStart = new Date(currentYear, 7, 1); // Aug 1
      } else { // Dec-Jan
        fiscalQuarterStart = new Date(currentYear - 1, 10, 1); // Nov 1 of previous year
      }
      
      return { startDate: fiscalQuarterStart, endDate: now };
    }
  },
  {
    label: "FY to Date",
    value: "fy-to-date",
    getDateRange: () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-based
      
      // Fiscal year starts February 1st
      const fiscalYearStart = currentMonth >= 1 ? // If February or later
        new Date(currentYear, 1, 1) : // Current year Feb 1
        new Date(currentYear - 1, 1, 1); // Previous year Feb 1
      
      return { startDate: fiscalYearStart, endDate: now };
    }
  },
  {
    label: "Last FQ",
    value: "last-fq",
    getDateRange: () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-based
      
      // Determine the previous fiscal quarter
      let lastFQStart: Date, lastFQEnd: Date;
      if (currentMonth >= 1 && currentMonth <= 4) { // Feb-May, so last FQ is Nov-Jan
        lastFQStart = new Date(currentYear - 1, 10, 1); // Nov 1 of previous year
        lastFQEnd = new Date(currentYear, 0, 31); // Jan 31 of current year
      } else if (currentMonth >= 5 && currentMonth <= 7) { // Jun-Aug, so last FQ is Feb-Apr
        lastFQStart = new Date(currentYear, 1, 1); // Feb 1
        lastFQEnd = new Date(currentYear, 4, 30); // Apr 30
      } else if (currentMonth >= 8 && currentMonth <= 10) { // Sep-Nov, so last FQ is May-Jul
        lastFQStart = new Date(currentYear, 4, 1); // May 1
        lastFQEnd = new Date(currentYear, 7, 31); // Jul 31
      } else { // Dec-Jan, so last FQ is Aug-Oct
        lastFQStart = new Date(currentYear, 7, 1); // Aug 1
        lastFQEnd = new Date(currentYear, 10, 30); // Oct 30
      }
      
      return { startDate: lastFQStart, endDate: lastFQEnd };
    }
  },
  {
    label: "Last FY",
    value: "last-fy",
    getDateRange: () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-based
      
      // Determine the previous fiscal year
      let lastFYStart: Date, lastFYEnd: Date;
      if (currentMonth >= 1) { // If February or later, last FY is previous year Feb 1 to current year Jan 31
        lastFYStart = new Date(currentYear - 1, 1, 1); // Feb 1 of previous year
        lastFYEnd = new Date(currentYear, 0, 31); // Jan 31 of current year
      } else { // If January, last FY is two years ago Feb 1 to previous year Jan 31
        lastFYStart = new Date(currentYear - 2, 1, 1); // Feb 1 of two years ago
        lastFYEnd = new Date(currentYear - 1, 0, 31); // Jan 31 of previous year
      }
      
      return { startDate: lastFYStart, endDate: lastFYEnd };
    }
  },
  {
    label: "All Time",
    value: "all-time",
    getDateRange: () => {
      const now = new Date();
      // Use a very early date to capture all historical data
      const startDate = new Date(2020, 0, 1); // January 1, 2020
      return { startDate, endDate: now };
    }
  }
];

export function getDateRangeByValue(value: string): { startDate: Date; endDate: Date } {
  const option = dateRangeOptions.find(opt => opt.value === value);
  if (!option) {
    // Default to FY to Date
    return dateRangeOptions.find(opt => opt.value === "fy-to-date")!.getDateRange();
  }
  return option.getDateRange();
}