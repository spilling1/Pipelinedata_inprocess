import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DollarSign, TrendingUp, TrendingDown, BarChart3, ChevronDown } from "lucide-react";
import { FilterState } from "@/types/pipeline";
import { useState, useMemo } from "react";

interface ValueChangeCardProps {
  filters: FilterState;
}

interface StageValueChange {
  fromStage: string;
  toStage: string;
  opportunityCount: number;
  avgYear1ArrChange: number;
  avgTotalContractValueChange: number;
  totalYear1ArrChange: number;
  totalContractValueChange: number;
  year1ArrChangePercentage: number;
  totalContractValueChangePercentage: number;
}

export default function ValueChangeCard({ filters }: ValueChangeCardProps) {
  const [dateRange, setDateRange] = useState<string>("FY to Date");
  
  // Calculate date range based on selection
  const getDateRange = (range: string) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    
    // Fiscal year starts Feb 1st
    const fiscalYearStart = currentMonth >= 1 ? 
      new Date(currentYear, 1, 1) : // Feb 1st of current year
      new Date(currentYear - 1, 1, 1); // Feb 1st of previous year
    
    const fiscalQuarterStarts = [
      new Date(fiscalYearStart.getFullYear(), 1, 1), // Feb 1 - Q1
      new Date(fiscalYearStart.getFullYear(), 4, 1), // May 1 - Q2  
      new Date(fiscalYearStart.getFullYear(), 7, 1), // Aug 1 - Q3
      new Date(fiscalYearStart.getFullYear(), 10, 1), // Nov 1 - Q4
    ];
    
    // Find current fiscal quarter
    let currentFQ = 0;
    for (let i = 0; i < fiscalQuarterStarts.length; i++) {
      if (now >= fiscalQuarterStarts[i]) {
        currentFQ = i;
      }
    }
    
    switch (range) {
      case "Last 1 Month":
        return {
          startDate: new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()),
          endDate: now
        };
      case "Last 3 Months":
        return {
          startDate: new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()),
          endDate: now
        };
      case "Last 6 Months":
        return {
          startDate: new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()),
          endDate: now
        };
      case "Last 12 Months":
        return {
          startDate: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
          endDate: now
        };
      case "Month to Date":
        return {
          startDate: new Date(now.getFullYear(), now.getMonth(), 1),
          endDate: now
        };
      case "FQ to Date":
        return {
          startDate: fiscalQuarterStarts[currentFQ],
          endDate: now
        };
      case "FY to Date":
        return {
          startDate: fiscalYearStart,
          endDate: now
        };
      case "Last FQ":
        const lastFQ = currentFQ === 0 ? 3 : currentFQ - 1;
        const lastFQYear = currentFQ === 0 ? fiscalYearStart.getFullYear() - 1 : fiscalYearStart.getFullYear();
        const lastFQStart = new Date(lastFQYear, lastFQ * 3 + 1, 1);
        const lastFQEnd = new Date(lastFQYear, (lastFQ + 1) * 3 + 1, 0);
        return {
          startDate: lastFQStart,
          endDate: lastFQEnd
        };
      case "Last FY":
        return {
          startDate: new Date(fiscalYearStart.getFullYear() - 1, 1, 1),
          endDate: new Date(fiscalYearStart.getFullYear(), 0, 31)
        };
      default:
        return { startDate: undefined, endDate: undefined };
    }
  };

  const { startDate, endDate } = useMemo(() => getDateRange(dateRange), [dateRange]);
  
  const { data: valueChangeData, isLoading } = useQuery<StageValueChange[]>({
    queryKey: ['/api/value-changes', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) {
        params.append('startDate', startDate.toISOString().split('T')[0]);
      }
      if (endDate) {
        params.append('endDate', endDate.toISOString().split('T')[0]);
      }
      
      const response = await fetch(`/api/value-changes?${params}`);
      if (!response.ok) throw new Error('Failed to fetch value changes data');
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Value Changes by Stage Transition
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const valueChanges: StageValueChange[] = valueChangeData || [];

  const formatCurrency = (value: number): string => {
    if (Math.abs(value) >= 1000000) {
      return `${value >= 0 ? '+' : '-'}$${Math.abs(value / 1000000).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1000) {
      return `${value >= 0 ? '+' : '-'}$${Math.abs(value / 1000).toFixed(0)}K`;
    } else {
      return `${value >= 0 ? '+' : ''}$${value.toFixed(0)}`;
    }
  };

  const formatPercentage = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Define custom stage order
  const stageOrder = [
    'Discover',
    'Developing Champions', 
    'ROI Analysis/Pricing',
    'Negotiation/Review'
  ];

  // Sort by custom stage order first, then by total contract value changes
  const sortedValueChanges = [...valueChanges].sort((a, b) => {
    const aIndex = stageOrder.indexOf(a.fromStage);
    const bIndex = stageOrder.indexOf(b.fromStage);
    
    // If both stages are in the custom order, sort by that order
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    // If only one is in the custom order, prioritize it
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    // If neither is in the custom order, sort alphabetically
    return a.fromStage.localeCompare(b.fromStage);
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-purple-600" />
            <CardTitle>Value Change by Stage</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs">
                {dateRange}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {[
                "Last 1 Month",
                "Last 3 Months", 
                "Last 6 Months",
                "Last 12 Months",
                "Month to Date",
                "FQ to Date",
                "FY to Date",
                "Last FQ",
                "Last FY",
                "Custom"
              ].map((option) => (
                <DropdownMenuItem
                  key={option}
                  onClick={() => setDateRange(option)}
                  className={dateRange === option ? "bg-blue-50 text-blue-700" : ""}
                >
                  {dateRange === option && "✓ "}
                  {option}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {sortedValueChanges.length > 0 ? (
          <div className="space-y-4">
            {/* Headers */}
            <div className="grid grid-cols-5 gap-2 text-xs font-medium text-gray-600 pb-2 border-b">
              <div>Stage</div>
              <div className="text-center">Opportunities</div>
              <div className="text-center">Avg Y1 ARR</div>
              <div className="text-center">Y1 ARR %</div>
              <div className="text-center">Impact</div>
            </div>

            {/* Value Change Rows */}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {sortedValueChanges.map((change, index) => (
                <div key={index} className="grid grid-cols-5 gap-2 py-2 text-sm border-b border-gray-100 last:border-b-0">
                  {/* Starting Stage */}
                  <div>
                    <div className="text-sm font-medium text-gray-900 truncate" title={change.fromStage}>
                      {change.fromStage}
                    </div>
                  </div>

                  {/* Deal Count */}
                  <div className="text-center text-gray-600">
                    {change.opportunityCount}
                  </div>

                  {/* Avg Year 1 ARR Change */}
                  <div className="text-center">
                    <span className={`font-semibold ${
                      change.avgYear1ArrChange > 0 ? 'text-green-600' : 
                      change.avgYear1ArrChange < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {formatCurrency(change.avgYear1ArrChange)}
                    </span>
                  </div>

                  {/* Year 1 ARR % Change */}
                  <div className="text-center">
                    <span className={`font-semibold ${
                      change.year1ArrChangePercentage > 0 ? 'text-green-600' : 
                      change.year1ArrChangePercentage < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {formatPercentage(change.year1ArrChangePercentage)}
                    </span>
                  </div>

                  {/* Impact Indicator */}
                  <div className="text-center">
                    {Math.abs(change.totalYear1ArrChange) > 100000 ? (
                      change.totalYear1ArrChange > 0 ? 
                        <TrendingUp className="h-4 w-4 text-green-600 mx-auto" /> :
                        <TrendingDown className="h-4 w-4 text-red-600 mx-auto" />
                    ) : (
                      <BarChart3 className="h-4 w-4 text-gray-400 mx-auto" />
                    )}
                  </div>
                </div>
              ))}
            </div>


          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No value changes found</p>
            <p className="text-xs text-gray-400">Upload multiple pipeline files to analyze value changes between stages</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}