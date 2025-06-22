import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, TrendingDown, Clock } from "lucide-react";
import { FilterState } from "@/types/pipeline";

interface DateSlippageCardProps {
  filters: FilterState;
}

interface StageSlippageData {
  stageName: string;
  avgSlippageDays: number;
  opportunityCount: number;
  totalSlippageDays: number;
}

interface QuarterRetentionData {
  stageName: string;
  totalOpportunities: number;
  sameQuarterClosures: number;
  retentionRate: number;
}

type DateRangeOption = 'Last 1 Month' | 'Last 3 Months' | 'Last 6 Months' | 'Last 12 Months' | 'Month to Date' | 'FQ to Date' | 'FY to Date' | 'Last FQ' | 'Last FY' | 'Custom';

export default function DateSlippageCard({ filters }: DateSlippageCardProps) {
  const [selectedRange, setSelectedRange] = useState<DateRangeOption>('FY to Date');

  // Calculate date range based on selection
  const getDateRange = (option: DateRangeOption) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-based
    
    // Fiscal year runs Feb 1 - Jan 31
    const getFiscalYear = () => {
      if (currentMonth >= 1) { // Feb-Dec
        return currentYear + 1;
      } else { // Jan
        return currentYear;
      }
    };
    
    const fiscalYear = getFiscalYear();
    
    switch (option) {
      case 'Last 1 Month':
        const lastMonth = new Date(now);
        lastMonth.setMonth(now.getMonth() - 1);
        return {
          startDate: lastMonth.toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0]
        };
        
      case 'Last 3 Months':
        const last3Months = new Date(now);
        last3Months.setMonth(now.getMonth() - 3);
        return {
          startDate: last3Months.toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0]
        };
        
      case 'Last 6 Months':
        const last6Months = new Date(now);
        last6Months.setMonth(now.getMonth() - 6);
        return {
          startDate: last6Months.toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0]
        };
        
      case 'Last 12 Months':
        const last12Months = new Date(now);
        last12Months.setFullYear(now.getFullYear() - 1);
        return {
          startDate: last12Months.toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0]
        };
        
      case 'Month to Date':
        const monthStart = new Date(currentYear, currentMonth, 1);
        return {
          startDate: monthStart.toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0]
        };
        
      case 'FQ to Date':
        // Fiscal quarters: Q1(Feb-Apr), Q2(May-Jul), Q3(Aug-Oct), Q4(Nov-Jan)
        let fqStart: Date;
        if (currentMonth >= 1 && currentMonth <= 3) { // Feb-Apr (Q1)
          fqStart = new Date(currentYear, 1, 1); // Feb 1
        } else if (currentMonth >= 4 && currentMonth <= 6) { // May-Jul (Q2)
          fqStart = new Date(currentYear, 4, 1); // May 1
        } else if (currentMonth >= 7 && currentMonth <= 9) { // Aug-Oct (Q3)
          fqStart = new Date(currentYear, 7, 1); // Aug 1
        } else { // Nov-Jan (Q4)
          fqStart = new Date(currentMonth === 0 ? currentYear - 1 : currentYear, 10, 1); // Nov 1
        }
        return {
          startDate: fqStart.toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0]
        };
        
      case 'FY to Date':
        const fyStart = new Date(fiscalYear - 1, 1, 1); // Feb 1 of fiscal year
        return {
          startDate: fyStart.toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0]
        };
        
      case 'Last FQ':
        // Calculate previous fiscal quarter
        let lastFqStart: Date, lastFqEnd: Date;
        if (currentMonth >= 1 && currentMonth <= 3) { // Currently Q1, last was Q4
          lastFqStart = new Date(currentYear - 1, 10, 1); // Nov 1
          lastFqEnd = new Date(currentYear, 0, 31); // Jan 31
        } else if (currentMonth >= 4 && currentMonth <= 6) { // Currently Q2, last was Q1
          lastFqStart = new Date(currentYear, 1, 1); // Feb 1
          lastFqEnd = new Date(currentYear, 3, 30); // Apr 30
        } else if (currentMonth >= 7 && currentMonth <= 9) { // Currently Q3, last was Q2
          lastFqStart = new Date(currentYear, 4, 1); // May 1
          lastFqEnd = new Date(currentYear, 6, 31); // Jul 31
        } else { // Currently Q4, last was Q3
          lastFqStart = new Date(currentYear, 7, 1); // Aug 1
          lastFqEnd = new Date(currentYear, 9, 31); // Oct 31
        }
        return {
          startDate: lastFqStart.toISOString().split('T')[0],
          endDate: lastFqEnd.toISOString().split('T')[0]
        };
        
      case 'Last FY':
        const lastFyStart = new Date(fiscalYear - 2, 1, 1); // Feb 1 of last fiscal year
        const lastFyEnd = new Date(fiscalYear - 1, 0, 31); // Jan 31 of last fiscal year
        return {
          startDate: lastFyStart.toISOString().split('T')[0],
          endDate: lastFyEnd.toISOString().split('T')[0]
        };
        
      case 'Custom':
      default:
        return {
          startDate: '2024-01-01',
          endDate: '2025-12-31'
        };
    }
  };

  const dateRange = getDateRange(selectedRange);

  const { data: slippageData, isLoading: slippageLoading } = useQuery<StageSlippageData[]>({
    queryKey: ['/api/stage-slippage', dateRange],
  });

  const { data: retentionData, isLoading: retentionLoading } = useQuery<QuarterRetentionData[]>({
    queryKey: ['/api/quarter-retention', dateRange],
  });

  const isLoading = slippageLoading || retentionLoading;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-red-600" />
            <CardTitle className="font-semibold tracking-tight text-[24px]">Date Slippage by Stage</CardTitle>
          </div>
          <Select value={selectedRange} onValueChange={(value) => setSelectedRange(value as DateRangeOption)}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Last 1 Month">Last 1 Month</SelectItem>
              <SelectItem value="Last 3 Months">Last 3 Months</SelectItem>
              <SelectItem value="Last 6 Months">Last 6 Months</SelectItem>
              <SelectItem value="Last 12 Months">Last 12 Months</SelectItem>
              <SelectItem value="Month to Date">Month to Date</SelectItem>
              <SelectItem value="FQ to Date">FQ to Date</SelectItem>
              <SelectItem value="FY to Date">FY to Date</SelectItem>
              <SelectItem value="Last FQ">Last FQ</SelectItem>
              <SelectItem value="Last FY">Last FY</SelectItem>
              <SelectItem value="Custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse h-8 bg-gray-200 rounded"></div>
            ))}
          </div>
        ) : (() => {
          // Define stage order as specified
          const stageOrder = [
            'Discover', 
            'Developing Champions',
            'ROI Analysis/Pricing',
            'Negotiation/Review',
            'Closed Won',
            'Closed Lost'
          ];

          // Create maps for quick lookup
          const slippageArray = Array.isArray(slippageData) ? slippageData : [];
          const retentionArray = Array.isArray(retentionData) ? retentionData : [];
          
          const slippageMap = new Map(slippageArray.map(item => [item.stageName, item]));
          const retentionMap = new Map(retentionArray.map(item => [item.stageName, item]));

          // Get all stages that have data in either dataset
          const allStagesList = [
            ...slippageArray.map(item => item.stageName),
            ...retentionArray.map(item => item.stageName)
          ];
          const allStages = [...new Set(allStagesList)];

          // Sort stages according to the specified order
          const orderedStages = stageOrder.filter(stage => allStages.includes(stage));

          if (orderedStages.length === 0) {
            return (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No data found for selected date range</p>
              </div>
            );
          }

          return (
            <div className="overflow-hidden">
              <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-600 pb-2 border-b">
                <div>Stage</div>
                <div className="text-center">Avg Slippage</div>
                <div className="text-center">Quarter Retention</div>
                <div className="text-center">Opportunities</div>
              </div>
              <div className="space-y-1 mt-2">
                {orderedStages.map((stageName) => {
                  const slippageItem = slippageMap.get(stageName);
                  const retentionItem = retentionMap.get(stageName);
                  
                  return (
                    <div key={stageName} className="grid grid-cols-4 gap-2 py-2 text-sm border-b border-gray-100 last:border-b-0">
                      <div className="truncate font-medium" title={stageName}>
                        {stageName}
                      </div>
                      <div className="text-center">
                        {slippageItem ? (
                          <span className={`font-semibold ${
                            slippageItem.avgSlippageDays > 30 ? 'text-red-600' : 
                            slippageItem.avgSlippageDays > 0 ? 'text-orange-600' : 'text-green-600'
                          }`}>
                            {slippageItem.avgSlippageDays > 0 ? '+' : ''}{slippageItem.avgSlippageDays}d
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                      <div className="text-center">
                        {retentionItem ? (
                          <span className={`font-semibold ${
                            retentionItem.retentionRate >= 70 ? 'text-green-600' : 
                            retentionItem.retentionRate >= 50 ? 'text-orange-600' : 'text-red-600'
                          }`}>
                            {retentionItem.retentionRate}%
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                      <div className="text-center text-gray-600">
                        {slippageItem?.opportunityCount || retentionItem?.totalOpportunities || 0}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}