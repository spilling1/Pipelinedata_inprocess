import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitBranch, AlertCircle } from "lucide-react";
import { useState } from "react";

interface LossReasonByStageData {
  reason: string;
  previousStage: string;
  count: number;
  totalValue: number;
  percentage: number;
}

type DateRangeOption = 'All Time' | 'Last 1 Month' | 'Last 3 months' | 'Last 6 months' | 'Last 12 months' | 'Month to Date' | 'FQ to Date' | 'FY to Date' | 'Last FQ' | 'Last FY' | 'Custom';

const StageReasonHeatMap = ({ data }: { data: LossReasonByStageData[] }) => {
  // Define custom stage order
  const stageOrder = [
    'Validation/Introduction',
    'Discover',
    'Developing Champions',
    'ROI Analysis/Pricing',
    'Negotiation/Review'
  ];
  
  // Get unique stages and sort by custom order
  const uniqueStages = Array.from(new Set(data.map(d => d.previousStage)));
  const stages = stageOrder.filter(stage => uniqueStages.includes(stage))
    .concat(uniqueStages.filter(stage => !stageOrder.includes(stage)).sort());
  
  const reasons = Array.from(new Set(data.map(d => d.reason))).sort();
  
  // Create matrix of counts
  const matrix: { [stage: string]: { [reason: string]: number } } = {};
  stages.forEach(stage => {
    matrix[stage] = {};
    reasons.forEach(reason => {
      matrix[stage][reason] = 0;
    });
  });
  
  // Fill matrix with actual data
  data.forEach(item => {
    matrix[item.previousStage][item.reason] = item.count;
  });
  
  // Find max value for heat map intensity
  const maxValue = Math.max(...data.map(d => d.count));
  
  const getHeatColor = (value: number) => {
    if (value === 0) return 'bg-gray-50';
    const intensity = value / maxValue;
    if (intensity >= 0.8) return 'bg-red-600 text-white';
    if (intensity >= 0.6) return 'bg-red-500 text-white';
    if (intensity >= 0.4) return 'bg-red-400 text-white';
    if (intensity >= 0.2) return 'bg-red-300';
    return 'bg-red-100';
  };
  
  return (
    <div className="border rounded-lg overflow-x-auto bg-white">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="p-3 text-left font-medium text-gray-700 border border-gray-200 min-w-[140px]">
              <div className="text-xs leading-tight">
                Previous Stage
              </div>
            </th>
            {reasons.map(reason => (
              <th key={reason} className="p-3 text-center font-medium text-gray-700 border border-gray-200 min-w-[120px]">
                <div className="text-xs leading-tight">
                  {reason.length > 15 ? `${reason.substring(0, 15)}...` : reason}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stages.map(stage => (
            <tr key={stage} className="hover:bg-gray-25">
              <td className="p-3 font-medium text-gray-700 border border-gray-200 bg-gray-50 min-w-[140px]">
                <div className="text-xs leading-tight">
                  {stage === 'Unknown Stage' ? 'Direct Import' : stage}
                </div>
              </td>
              {reasons.map(reason => {
                const value = matrix[stage][reason];
                return (
                  <td 
                    key={`${stage}-${reason}`} 
                    className={`p-3 text-center border border-gray-200 ${getHeatColor(value)} transition-colors min-w-[120px]`}
                    title={`${stage === 'Unknown Stage' ? 'Direct Import' : stage} → ${reason}: ${value} deals`}
                  >
                    <div className="text-sm font-medium">
                      {value > 0 ? value : ''}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-4 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-medium">Heat Map Legend:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-50 border border-gray-300 rounded-sm"></div>
            <span>0 deals</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border border-gray-300 rounded-sm"></div>
            <span>Low (1-20%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-400 border border-gray-300 rounded-sm"></div>
            <span>Medium (40-60%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-600 border border-gray-300 rounded-sm"></div>
            <span>High (80%+)</span>
          </div>
        </div>
        <div className="mt-2 text-gray-500">
          * "Direct Import" indicates deals that were imported directly as "Closed Lost" without stage progression history
        </div>
      </div>
    </div>
  );
};

export function LossReasonByStage() {
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
      case 'All Time':
        return {
          startDate: null,
          endDate: null
        };
        
      case 'Last 1 Month':
        const last1Month = new Date(now);
        last1Month.setMonth(now.getMonth() - 1);
        return {
          startDate: last1Month.toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0]
        };
        
      case 'Last 3 months':
        const last3Months = new Date(now);
        last3Months.setMonth(now.getMonth() - 3);
        return {
          startDate: last3Months.toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0]
        };
        
      case 'Last 6 months':
        const last6Months = new Date(now);
        last6Months.setMonth(now.getMonth() - 6);
        return {
          startDate: last6Months.toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0]
        };
        
      case 'Last 12 months':
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
        if (currentMonth >= 1 && currentMonth <= 3) { // Q1: Feb-Apr
          fqStart = new Date(currentYear, 1, 1); // Feb 1
        } else if (currentMonth >= 4 && currentMonth <= 6) { // Q2: May-Jul
          fqStart = new Date(currentYear, 4, 1); // May 1
        } else if (currentMonth >= 7 && currentMonth <= 9) { // Q3: Aug-Oct
          fqStart = new Date(currentYear, 7, 1); // Aug 1
        } else { // Q4: Nov-Jan
          fqStart = new Date(currentYear, 10, 1); // Nov 1
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
        // Previous fiscal quarter
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

  const { data: lossReasonsByStage, isLoading } = useQuery<LossReasonByStageData[]>({
    queryKey: ['/api/analytics/loss-reasons-by-previous-stage', dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.startDate && dateRange.endDate) {
        params.append('startDate', dateRange.startDate);
        params.append('endDate', dateRange.endDate);
      }
      const url = params.toString() ? `/api/analytics/loss-reasons-by-previous-stage?${params.toString()}` : '/api/analytics/loss-reasons-by-previous-stage';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch loss reasons by stage');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Loss Reasons by Stage
          </CardTitle>
          <CardDescription>
            Loss patterns across pipeline stages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!lossReasonsByStage || lossReasonsByStage.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Loss Reasons by Stage
          </CardTitle>
          <CardDescription>
            Loss patterns across pipeline stages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No Stage-Level Loss Data Available</p>
            <p className="text-sm mt-2">
              Stage-wise loss analysis will appear here when deals with loss/DQ reasons are uploaded
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-red-500" />
              Loss Reasons by Stage
            </CardTitle>
            <CardDescription>
              Loss patterns across pipeline stages
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedRange} onValueChange={(value: DateRangeOption) => setSelectedRange(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Time">All Time</SelectItem>
                <SelectItem value="Last 1 Month">Last 1 Month</SelectItem>
                <SelectItem value="Last 3 months">Last 3 months</SelectItem>
                <SelectItem value="Last 6 months">Last 6 months</SelectItem>
                <SelectItem value="Last 12 months">Last 12 months</SelectItem>
                <SelectItem value="Month to Date">Month to Date</SelectItem>
                <SelectItem value="FQ to Date">FQ to Date</SelectItem>
                <SelectItem value="FY to Date">FY to Date</SelectItem>
                <SelectItem value="Last FQ">Last FQ</SelectItem>
                <SelectItem value="Last FY">Last FY</SelectItem>
                <SelectItem value="Custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Loss Reasons by Previous Stage
          </h3>
          <div className="overflow-x-auto">
            <StageReasonHeatMap data={lossReasonsByStage} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}