export const dateRangeOptions = [
  { id: 'last12months', label: 'Last 12 Months' },
  { id: 'last6months', label: 'Last 6 Months' },
  { id: 'last3months', label: 'Last 3 Months' },
  { id: 'last1month', label: 'Last 1 Month' },
  { id: 'fytodate', label: 'FY to Date' },
  { id: 'monthtodate', label: 'Month to Date' }
];

export function getDateRangeByValue(value: string): { startDate?: Date; endDate?: Date } {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  switch (value) {
    case 'last-12-months':
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setFullYear(currentYear - 1);
      return {
        startDate: twelveMonthsAgo,
        endDate: today
      };
    
    case 'last-6-months':
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(currentMonth - 6);
      return {
        startDate: sixMonthsAgo,
        endDate: today
      };
    
    case 'last-3-months':
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(currentMonth - 3);
      return {
        startDate: threeMonthsAgo,
        endDate: today
      };
    
    case 'fy-to-date':
      // Fiscal year starts Feb 1
      const fyStart = currentMonth >= 1 ? 
        new Date(currentYear, 1, 1) : // Feb 1 this year
        new Date(currentYear - 1, 1, 1); // Feb 1 last year
      return {
        startDate: fyStart,
        endDate: today
      };
    
    case 'month-to-date':
      const monthStart = new Date(currentYear, currentMonth, 1);
      return {
        startDate: monthStart,
        endDate: today
      };
    
    default:
      return {};
  }
}