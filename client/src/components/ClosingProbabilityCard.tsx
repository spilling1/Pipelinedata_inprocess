import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Target, ChevronDown, ChevronRight } from "lucide-react";
import { FilterState } from "@/types/pipeline";
import { useState, useMemo } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ClosingProbabilityCardProps {
  filters: FilterState;
}

interface StageProbability {
  stage: string;
  totalDeals: number;
  closedWon: number;
  closedLost: number;
  winRate: number;
  conversionToNext: number;
  deals?: DealDetail[];
}

interface DealDetail {
  opportunityName: string;
  clientName?: string;
  finalStage: string;
  closeDate: string;
  value?: number;
}

type DateRangeOption = 'Last 1 Month' | 'Last 3 Months' | 'Last 6 Months' | 'Last 12 Months' | 'Month to Date' | 'FQ to Date' | 'FY to Date' | 'Last FQ' | 'Last FY' | 'Custom';

export default function ClosingProbabilityCard({ filters }: ClosingProbabilityCardProps) {
  const [selectedRange, setSelectedRange] = useState<DateRangeOption>('FY to Date');
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  
  const toggleStageExpansion = (stage: string) => {
    setExpandedStages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stage)) {
        newSet.delete(stage);
      } else {
        newSet.add(stage);
      }
      return newSet;
    });
  };
  
  // Calculate date range based on selection
  const dateRange = useMemo(() => {
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
    
    switch (selectedRange) {
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
        const fyStart = currentMonth >= 1 ? 
          new Date(currentYear, 1, 1) : // Feb 1 this year
          new Date(currentYear - 1, 1, 1); // Feb 1 last year
        return {
          startDate: fyStart.toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0]
        };
        
      case 'Last FQ':
        // Calculate previous fiscal quarter
        let lastFqStart: Date, lastFqEnd: Date;
        if (currentMonth >= 1 && currentMonth <= 3) { // Current Q1, so last FQ is Q4
          lastFqStart = new Date(currentYear - 1, 10, 1); // Nov 1 previous year
          lastFqEnd = new Date(currentYear, 0, 31); // Jan 31 current year
        } else if (currentMonth >= 4 && currentMonth <= 6) { // Current Q2, so last FQ is Q1
          lastFqStart = new Date(currentYear, 1, 1); // Feb 1
          lastFqEnd = new Date(currentYear, 3, 30); // Apr 30
        } else if (currentMonth >= 7 && currentMonth <= 9) { // Current Q3, so last FQ is Q2
          lastFqStart = new Date(currentYear, 4, 1); // May 1
          lastFqEnd = new Date(currentYear, 6, 31); // Jul 31
        } else { // Current Q4, so last FQ is Q3
          lastFqStart = new Date(currentYear, 7, 1); // Aug 1
          lastFqEnd = new Date(currentYear, 9, 31); // Oct 31
        }
        return {
          startDate: lastFqStart.toISOString().split('T')[0],
          endDate: lastFqEnd.toISOString().split('T')[0]
        };
        
      case 'Last FY':
        const lastFyStart = currentMonth >= 1 ? 
          new Date(currentYear - 1, 1, 1) : // Feb 1 previous year
          new Date(currentYear - 2, 1, 1); // Feb 1 two years ago
        const lastFyEnd = currentMonth >= 1 ? 
          new Date(currentYear, 0, 31) : // Jan 31 current year
          new Date(currentYear - 1, 0, 31); // Jan 31 previous year
        return {
          startDate: lastFyStart.toISOString().split('T')[0],
          endDate: lastFyEnd.toISOString().split('T')[0]
        };
        
      default:
        return {
          startDate: undefined,
          endDate: undefined
        };
    }
  }, [selectedRange]);

  const { data: probabilityData, isLoading } = useQuery({
    queryKey: ['/api/closing-probability', dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      
      const response = await fetch(`/api/closing-probability?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Closing Probability by Stage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stageProbabilities: StageProbability[] = (probabilityData as StageProbability[]) || [];

  if (stageProbabilities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Closing Probability by Stage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Target className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No closed deals found</p>
            <p className="text-xs text-gray-400">Upload pipeline files with closed opportunities to see win rates</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Stage order for funnel
  const stageOrder = [
    'Validation/Introduction',
    'Discover', 
    'Developing Champions',
    'ROI Analysis/Pricing',
    'Negotiation/Review'
  ];

  // Sort stages by the defined order
  const sortedStages = stageProbabilities
    .filter(stage => stageOrder.includes(stage.stage))
    .sort((a, b) => stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage));

  const maxWidth = Math.max(...sortedStages.map(s => s.totalDeals));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-green-600" />
            <CardTitle className="font-semibold tracking-tight text-[24px]">Closing Probability by Stage</CardTitle>
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
      <CardContent>
        <div className="space-y-6">
          {/* Funnel Chart */}
          <div className="space-y-4">
            {sortedStages.map((stage, index) => {
              const widthPercentage = (stage.totalDeals / maxWidth) * 100;
              const winRateColor = stage.winRate >= 50 ? 'bg-green-500' : 
                                 stage.winRate >= 25 ? 'bg-yellow-500' : 'bg-red-500';
              
              const isExpanded = expandedStages.has(stage.stage);
              
              return (
                <Collapsible key={stage.stage} open={isExpanded} onOpenChange={() => toggleStageExpansion(stage.stage)}>
                  <div className="space-y-2">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between hover:bg-gray-50 p-2 rounded-lg cursor-pointer">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500" />
                          )}
                          <h4 className="font-medium text-sm">{stage.stage}</h4>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span>{stage.totalDeals} deals</span>
                          <Badge 
                            variant="outline" 
                            className={`${winRateColor} text-white border-0`}
                          >
                            {stage.winRate.toFixed(1)}% win rate
                          </Badge>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    {/* Funnel Bar */}
                    <div className="relative">
                      <div className="w-full bg-gray-200 rounded-lg h-8 flex items-center">
                        <div 
                          className={`${winRateColor} rounded-lg h-8 flex items-center justify-center transition-all duration-300`}
                          style={{ width: `${widthPercentage}%` }}
                        >
                          <div className="flex items-center gap-2 text-white text-xs font-medium px-2">
                            <TrendingUp className="h-3 w-3" />
                            <span>{stage.closedWon} won / {stage.closedLost} lost</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Deal Details */}
                    <CollapsibleContent>
                      <div className="mt-3 space-y-2">
                        {stage.deals && stage.deals.length > 0 ? (
                          stage.deals.map((deal, index) => (
                            <div key={index} className="bg-gray-50 p-3 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-sm">{deal.opportunityName}</div>
                                  {deal.clientName && (
                                    <div className="text-xs text-gray-600">{deal.clientName}</div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="text-xs">
                                    <Badge 
                                      variant="outline"
                                      className={deal.finalStage.toLowerCase().includes('won') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                                    >
                                      {deal.finalStage}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    Closed: {deal.closeDate}
                                  </div>
                                  {deal.value && deal.value > 0 && (
                                    <div className="text-xs text-gray-600">
                                      ${deal.value.toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-gray-500 text-center py-2">
                            No deal details available
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>


        </div>
      </CardContent>
    </Card>
  );
}