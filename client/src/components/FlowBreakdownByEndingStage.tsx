import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronDown, ChevronRight, GitBranch } from "lucide-react";
import { useState, useMemo } from "react";
import { FilterState } from "@/types/pipeline";

interface FlowBreakdownByEndingStageProps {
  filters: FilterState;
}

interface FlowData {
  startStage: string;
  endStage: string;
  count: number;
  value: number;
}

interface DealMovement {
  opportunityName: string;
  from: string;
  to: string;
  date: Date;
  value: number;
  opportunityId: string;
  clientName?: string;
}

export default function FlowBreakdownByEndingStage({ filters }: FlowBreakdownByEndingStageProps) {
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [timePeriod, setTimePeriod] = useState("FY to Date");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();

  const dateRange = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-based
    
    // Fiscal year starts February 1st
    const fiscalYearStart = currentMonth >= 1 ? // If February or later
      new Date(currentYear, 1, 1) : // Current year Feb 1
      new Date(currentYear - 1, 1, 1); // Previous year Feb 1
    
    const fiscalYearEnd = currentMonth >= 1 ? 
      new Date(currentYear + 1, 0, 31) : // Next year Jan 31
      new Date(currentYear, 0, 31); // Current year Jan 31

    // Fiscal quarter calculation
    const getFiscalQuarter = (date: Date) => {
      const month = date.getMonth();
      if (month >= 1 && month <= 3) return 1; // Feb-Apr
      if (month >= 4 && month <= 6) return 2; // May-Jul  
      if (month >= 7 && month <= 9) return 3; // Aug-Oct
      return 4; // Nov-Jan
    };

    switch (timePeriod) {
      case "Last 1 Month":
        const oneMonthAgo = new Date(now);
        oneMonthAgo.setMonth(now.getMonth() - 1);
        return { startDate: oneMonthAgo, endDate: now };
      case "Last 3 Months":
        const threeMonthsAgo = new Date(now);
        threeMonthsAgo.setMonth(now.getMonth() - 3);
        return { startDate: threeMonthsAgo, endDate: now };
      case "Last 6 Months":
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(now.getMonth() - 6);
        return { startDate: sixMonthsAgo, endDate: now };
      case "Last 12 Months":
        const twelveMonthsAgo = new Date(now);
        twelveMonthsAgo.setFullYear(now.getFullYear() - 1);
        return { startDate: twelveMonthsAgo, endDate: now };
      case "Month to Date":
        const monthStart = new Date(currentYear, currentMonth, 1);
        return { startDate: monthStart, endDate: now };
      case "FQ to Date":
        const currentFQ = getFiscalQuarter(now);
        const fqStartMonth = [1, 4, 7, 10][currentFQ - 1]; // Feb, May, Aug, Nov
        const fqStart = new Date(currentYear, fqStartMonth, 1);
        return { startDate: fqStart, endDate: now };
      case "Last FQ":
        const lastFQ = getFiscalQuarter(now) - 1;
        if (lastFQ === 0) {
          // Previous fiscal year Q4
          const lastFQStart = new Date(currentYear - 1, 10, 1); // Nov
          const lastFQEnd = new Date(currentYear, 0, 31); // Jan 31
          return { startDate: lastFQStart, endDate: lastFQEnd };
        } else {
          const lastFQStartMonth = [1, 4, 7][lastFQ - 1];
          const lastFQStart = new Date(currentYear, lastFQStartMonth, 1);
          const lastFQEnd = new Date(currentYear, lastFQStartMonth + 3, 0);
          return { startDate: lastFQStart, endDate: lastFQEnd };
        }
      case "Last FY":
        const lastFYStart = new Date(fiscalYearStart);
        lastFYStart.setFullYear(fiscalYearStart.getFullYear() - 1);
        const lastFYEnd = new Date(fiscalYearEnd);
        lastFYEnd.setFullYear(fiscalYearEnd.getFullYear() - 1);
        return { startDate: lastFYStart, endDate: lastFYEnd };
      case "Custom":
        if (customStartDate && customEndDate) {
          return { startDate: customStartDate, endDate: customEndDate };
        }
        return { startDate: fiscalYearStart, endDate: now };
      default: // "FY to Date"
        return { startDate: fiscalYearStart, endDate: now };
    }
  }, [timePeriod, customStartDate, customEndDate]);

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['/api/analytics', filters, dateRange.startDate?.toISOString(), dateRange.endDate?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate.toISOString().split('T')[0]);
      }
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate.toISOString().split('T')[0]);
      }
      
      const response = await fetch(`/api/analytics?${params}`);
      if (!response.ok) throw new Error('Failed to fetch analytics data');
      return response.json();
    }
  });

  const toggleStageExpansion = (stage: string) => {
    const newExpanded = new Set(expandedStages);
    if (newExpanded.has(stage)) {
      newExpanded.delete(stage);
    } else {
      newExpanded.add(stage);
    }
    setExpandedStages(newExpanded);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(date));
  };

  const getStageColor = (stage: string): string => {
    const colors: Record<string, string> = {
      'Validation/Introduction': '#3B82F6',
      'Discover': '#10B981',
      'Developing Champions': '#F59E0B',
      'ROI Analysis/Pricing': '#8B5CF6',
      'Negotiation/Review': '#EF4444',
      'Closed Won': '#059669',
      'Closed Lost': '#DC2626',
    };
    return colors[stage] || '#6B7280';
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Flow Breakdown by Ending Stage</h3>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const recentMovements: DealMovement[] = (analyticsData as any)?.recentMovements || [];

  // Group flows by ending stage
  const stageGroups = new Map<string, FlowData[]>();
  
  // Convert movements to flow data and group by ending stage
  recentMovements.forEach(movement => {
    const endStage = movement.to;
    const flowKey = `${movement.from}-${movement.to}`;
    
    if (!stageGroups.has(endStage)) {
      stageGroups.set(endStage, []);
    }
    
    const existingFlow = stageGroups.get(endStage)!.find(f => f.startStage === movement.from && f.endStage === movement.to);
    
    if (existingFlow) {
      existingFlow.count += 1;
      existingFlow.value += movement.value;
    } else {
      stageGroups.get(endStage)!.push({
        startStage: movement.from,
        endStage: movement.to,
        count: 1,
        value: movement.value
      });
    }
  });

  return (
    <Card className="h-full">
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900">Flow Breakdown by Ending Stage</h3>
        <p className="text-sm text-gray-600">Deal movements grouped by destination stage</p>
      </CardHeader>
      <CardContent>
        {stageGroups.size === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <GitBranch className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No recent stage movements detected</p>
            <p className="text-xs text-gray-400">Upload pipeline files to analyze deal flow patterns</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {Array.from(stageGroups.entries())
              .sort(([,a], [,b]) => b.reduce((sum, f) => sum + f.count, 0) - a.reduce((sum, f) => sum + f.count, 0))
              .map(([endStage, flows]) => {
                const totalCount = flows.reduce((sum, f) => sum + f.count, 0);
                const totalValue = flows.reduce((sum, f) => sum + f.value, 0);
                const isExpanded = expandedStages.has(endStage);
                
                return (
                  <div key={endStage} className="border rounded-lg">
                    <Button
                      variant="ghost"
                      className="w-full p-3 h-auto justify-between hover:bg-gray-50"
                      onClick={() => toggleStageExpansion(endStage)}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getStageColor(endStage) }}
                        />
                        <div className="text-left">
                          <div className="font-medium text-gray-900 text-sm">{endStage}</div>
                          <div className="text-xs text-gray-500">
                            {totalCount} movements • {formatCurrency(totalValue)}
                          </div>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                    
                    {isExpanded && (
                      <div className="px-3 pb-3">
                        <div className="space-y-2">
                          {flows
                            .sort((a, b) => b.count - a.count)
                            .map((flow, index) => (
                              <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded text-xs">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: getStageColor(flow.startStage) }}
                                  />
                                  <span className="text-gray-700">{flow.startStage}</span>
                                  <ArrowRight className="h-3 w-3 text-gray-400" />
                                  <span className="font-medium text-gray-900">{flow.endStage}</span>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium text-gray-900">{flow.count}</div>
                                  <div className="text-gray-500">{formatCurrency(flow.value)}</div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}