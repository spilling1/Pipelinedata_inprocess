import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, TrendingUp, Calendar } from "lucide-react";
import { FilterState } from "@/types/pipeline";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useState, useMemo } from "react";

interface StageTimingCardProps {
  filters: FilterState;
}

interface StageTimingData {
  stage: string;
  avgDays: number;
  dealCount: number;
}

export default function StageTimingCard({ filters }: StageTimingCardProps) {
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

    const currentFQ = getFiscalQuarter(now);
    const fiscalQuarterStart = (() => {
      if (currentFQ === 1) return new Date(currentYear, 1, 1); // Feb 1
      if (currentFQ === 2) return new Date(currentYear, 4, 1); // May 1
      if (currentFQ === 3) return new Date(currentYear, 7, 1); // Aug 1
      return new Date(currentYear, 10, 1); // Nov 1
    })();

    const lastFQStart = (() => {
      if (currentFQ === 1) return new Date(currentYear - 1, 10, 1); // Nov 1
      if (currentFQ === 2) return new Date(currentYear, 1, 1); // Feb 1
      if (currentFQ === 3) return new Date(currentYear, 4, 1); // May 1
      return new Date(currentYear, 7, 1); // Aug 1
    })();

    const lastFQEnd = (() => {
      if (currentFQ === 1) return new Date(currentYear, 0, 31); // Jan 31
      if (currentFQ === 2) return new Date(currentYear, 3, 30); // Apr 30
      if (currentFQ === 3) return new Date(currentYear, 6, 31); // Jul 31
      return new Date(currentYear, 9, 31); // Oct 31
    })();

    switch (timePeriod) {
      case "Last 3 months":
        return {
          startDate: new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()),
          endDate: now
        };
      case "Last 6 months":
        return {
          startDate: new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()),
          endDate: now
        };
      case "Last 12 months":
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
          startDate: fiscalQuarterStart,
          endDate: now
        };
      case "FY to Date":
        return {
          startDate: fiscalYearStart,
          endDate: now
        };
      case "Last FQ":
        return {
          startDate: lastFQStart,
          endDate: lastFQEnd
        };
      case "Last FY":
        const lastFYStart = new Date(fiscalYearStart.getFullYear() - 1, 1, 1);
        const lastFYEnd = new Date(fiscalYearStart.getFullYear(), 0, 31);
        return {
          startDate: lastFYStart,
          endDate: lastFYEnd
        };
      case "Custom":
        return {
          startDate: customStartDate,
          endDate: customEndDate
        };
      default:
        return {
          startDate: fiscalYearStart,
          endDate: now
        };
    }
  }, [timePeriod, customStartDate, customEndDate]);

  const { data: stageTimingData, isLoading } = useQuery({
    queryKey: ['/api/stage-timing', filters, dateRange.startDate?.toISOString(), dateRange.endDate?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate.toISOString().split('T')[0]);
      }
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate.toISOString().split('T')[0]);
      }
      
      const response = await fetch(`/api/stage-timing?${params}`);
      if (!response.ok) throw new Error('Failed to fetch stage timing data');
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Average Stage Duration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
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

  const stageTiming: StageTimingData[] = stageTimingData || [];

  const formatDuration = (days: number): string => {
    if (days < 1) {
      return `${Math.round(days * 24)}h`;
    } else if (days < 7) {
      return `${Math.round(days)}d`;
    } else if (days < 30) {
      return `${Math.round(days / 7)}w`;
    } else {
      return `${Math.round(days / 30)}mo`;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Average Stage Duration
          </CardTitle>
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem key="last-3-months" value="Last 3 months">Last 3 months</SelectItem>
              <SelectItem key="last-6-months" value="Last 6 months">Last 6 months</SelectItem>
              <SelectItem key="last-12-months" value="Last 12 months">Last 12 months</SelectItem>
              <SelectItem key="month-to-date" value="Month to Date">Month to Date</SelectItem>
              <SelectItem key="fq-to-date" value="FQ to Date">FQ to Date</SelectItem>
              <SelectItem key="fy-to-date" value="FY to Date">FY to Date</SelectItem>
              <SelectItem key="last-fq" value="Last FQ">Last FQ</SelectItem>
              <SelectItem key="last-fy" value="Last FY">Last FY</SelectItem>
              <SelectItem key="custom" value="Custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {timePeriod === "Custom" && (
          <div className="flex items-center justify-end gap-2 mt-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  {customStartDate ? format(customStartDate, "MMM dd") : "Start"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={customStartDate}
                  onSelect={setCustomStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  {customEndDate ? format(customEndDate, "MMM dd") : "End"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={customEndDate}
                  onSelect={setCustomEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {stageTiming.length > 0 ? (
          <div className="space-y-3">
            {stageTiming.map((stage) => {
              const isPreSales = stage.stage === 'Validation/Introduction';
              return (
                <div key={stage.stage} className={`flex justify-between items-center ${isPreSales ? 'opacity-60' : ''}`}>
                  <div className="flex-1">
                    <div className={`text-sm font-medium truncate ${isPreSales ? 'text-gray-600' : 'text-gray-900'}`}>
                      {stage.stage}
                      {isPreSales && <span className="text-xs ml-1 text-gray-500">(pre-sales)</span>}
                    </div>
                    <div className="text-xs text-gray-500">
                      {stage.dealCount} deal{stage.dealCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${isPreSales ? 'text-gray-500' : 'text-blue-600'}`}>
                      {formatDuration(stage.avgDays)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {Math.round(stage.avgDays)} days
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Total Expected Days to Close */}
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="text-sm font-bold text-gray-900">
                    Sales Cycle Duration
                  </div>
                  <div className="text-xs text-gray-500">
                    Excludes pre-sales qualification
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-green-600">
                    {formatDuration(stageTiming.filter(stage => stage.stage !== 'Validation/Introduction').reduce((sum, stage) => sum + stage.avgDays, 0))}
                  </div>
                  <div className="text-xs text-gray-500">
                    {Math.round(stageTiming.filter(stage => stage.stage !== 'Validation/Introduction').reduce((sum, stage) => sum + stage.avgDays, 0))} days
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium mb-1">No stage timing data available</p>
            <p className="text-xs">Upload multiple pipeline files to track stage transitions</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}