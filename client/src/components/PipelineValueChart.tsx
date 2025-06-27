import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, CalendarDays } from "lucide-react";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { FilterState } from "@/types/pipeline";

interface PipelineValueChartProps {
  filters: FilterState;
}

// Helper function to calculate date ranges for fiscal periods
const getFiscalDateRange = (periodId: string) => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-based (Jan = 0)
  
  // Fiscal year starts February 1st
  const getFiscalYear = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return month >= 1 ? year : year - 1; // FY starts in Feb (month 1)
  };
  
  const currentFiscalYear = getFiscalYear(today);
  
  switch (periodId) {
    case 'last1month':
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(currentMonth - 1);
      return {
        startDate: oneMonthAgo.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      };
      
    case 'last3months':
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(currentMonth - 3);
      return {
        startDate: threeMonthsAgo.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      };
      
    case 'last6months':
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(currentMonth - 6);
      return {
        startDate: sixMonthsAgo.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      };
      
    case 'last12months':
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setFullYear(currentYear - 1);
      return {
        startDate: twelveMonthsAgo.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      };
      
    case 'monthtodate':
      const monthStart = new Date(currentYear, currentMonth, 1);
      return {
        startDate: monthStart.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      };
      
    case 'fqtodate':
      // Current fiscal quarter to date
      const fiscalQuarter = Math.floor((currentMonth + 10) % 12 / 3) + 1; // Feb-Apr=Q1, May-Jul=Q2, etc.
      let fqStartMonth;
      if (fiscalQuarter === 1) fqStartMonth = 1; // Feb
      else if (fiscalQuarter === 2) fqStartMonth = 4; // May  
      else if (fiscalQuarter === 3) fqStartMonth = 7; // Aug
      else fqStartMonth = 10; // Nov
      
      const fqStartYear = fqStartMonth <= currentMonth ? currentYear : currentYear - 1;
      const fqStart = new Date(fqStartYear, fqStartMonth, 1);
      return {
        startDate: fqStart.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      };
      
    case 'fytodate':
      // Current fiscal year to date (Feb 1 to today)
      const fyStart = new Date(currentFiscalYear, 1, 1); // Feb 1
      return {
        startDate: fyStart.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      };
      
    case 'lastfq':
      // Previous fiscal quarter
      const prevFiscalQuarter = Math.floor((currentMonth + 10) % 12 / 3); // 0-3
      let lastFqStartMonth, lastFqEndMonth;
      if (prevFiscalQuarter === 0) { lastFqStartMonth = 10; lastFqEndMonth = 0; } // Nov-Jan
      else if (prevFiscalQuarter === 1) { lastFqStartMonth = 1; lastFqEndMonth = 3; } // Feb-Apr
      else if (prevFiscalQuarter === 2) { lastFqStartMonth = 4; lastFqEndMonth = 6; } // May-Jul
      else { lastFqStartMonth = 7; lastFqEndMonth = 9; } // Aug-Oct
      
      const lastFqStartYear = lastFqStartMonth <= currentMonth ? currentYear - 1 : currentYear - 1;
      const lastFqEndYear = lastFqEndMonth >= currentMonth ? currentYear : currentYear;
      
      const lastFqStart = new Date(lastFqStartYear, lastFqStartMonth, 1);
      const lastFqEnd = new Date(lastFqEndYear, lastFqEndMonth + 1, 0); // Last day of month
      return {
        startDate: lastFqStart.toISOString().split('T')[0],
        endDate: lastFqEnd.toISOString().split('T')[0]
      };
      
    case 'lastfy':
      // Previous fiscal year (Feb 1 - Jan 31)
      const lastFyStart = new Date(currentFiscalYear - 1, 1, 1); // Feb 1 of last FY
      const lastFyEnd = new Date(currentFiscalYear, 0, 31); // Jan 31 of current year
      return {
        startDate: lastFyStart.toISOString().split('T')[0],
        endDate: lastFyEnd.toISOString().split('T')[0]
      };
      
    default:
      // Default to FQ to date
      return getFiscalDateRange('fqtodate');
  }
};

export default function PipelineValueChart({ filters }: PipelineValueChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('fytodate');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  
  // Create filters with the selected time period
  const getChartFilters = () => {
    if (selectedPeriod === 'custom') {
      return {
        ...filters,
        startDate: customStartDate,
        endDate: customEndDate
      };
    } else {
      return {
        ...filters,
        ...getFiscalDateRange(selectedPeriod)
      };
    }
  };
  
  const chartFilters = getChartFilters();
  
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['/api/analytics', chartFilters],
  });
  
  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value);
    if (value === 'custom') {
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);
    }
  };
  
  const applyCustomDates = () => {
    setShowCustomPicker(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pipeline Value Trend</CardTitle>
            <div className="w-32 h-8 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  const pipelineData = (analytics as any)?.pipelineValueByDate || [];
  
  // Memoize expensive data processing
  const chartData = useMemo(() => {
    return pipelineData.map((item: any) => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
      dateTimestamp: new Date(item.date).getTime(),
      value: item.value,
      formattedValue: item.value >= 1000000 
        ? `$${(item.value / 1000000).toFixed(1)}M`
        : `$${(item.value / 1000).toFixed(0)}K`
    }));
  }, [pipelineData]);

  // Memoize tooltip formatting function
  const formatTooltipValue = useCallback((value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value.toFixed(0)}`;
    }
  }, []);

  // Memoize expensive custom ticks calculation
  const customTicks = useMemo(() => {
    if (chartData.length === 0) return [];
    
    const firstTimestamp = chartData[0].dateTimestamp;
    const lastTimestamp = chartData[chartData.length - 1].dateTimestamp;
    const timeSpan = lastTimestamp - firstTimestamp;
    
    // Always aim for 6-8 ticks
    const targetTicks = 7;
    const interval = timeSpan / (targetTicks - 1);
    
    const ticks = [];
    for (let i = 0; i < targetTicks; i++) {
      ticks.push(firstTimestamp + (interval * i));
    }
    
    return ticks;
  }, [chartData]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Pipeline Value Trend</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last1month">Last 1 Month</SelectItem>
                <SelectItem value="last3months">Last 3 Months</SelectItem>
                <SelectItem value="last6months">Last 6 Months</SelectItem>
                <SelectItem value="last12months">Last 12 Months</SelectItem>
                <SelectItem value="monthtodate">Month to Date</SelectItem>
                <SelectItem value="fqtodate">FQ to Date</SelectItem>
                <SelectItem value="fytodate">FY to Date</SelectItem>
                <SelectItem value="lastfq">Last FQ</SelectItem>
                <SelectItem value="lastfy">Last FY</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            
            {selectedPeriod === 'custom' && (
              <Popover open={showCustomPicker} onOpenChange={setShowCustomPicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarDays className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="start-date">Start Date</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end-date">End Date</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                      />
                    </div>
                    <Button onClick={applyCustomDates} className="w-full">
                      Apply Dates
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="dateTimestamp"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  ticks={customTicks}
                  tickFormatter={(timestamp) => {
                    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
                  }}
                  stroke="#666"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#666"
                  fontSize={12}
                  tickFormatter={(value) => {
                    if (value >= 1000000) {
                      return `$${(value / 1000000).toFixed(1)}M`;
                    } else if (value >= 1000) {
                      return `$${(value / 1000).toFixed(0)}K`;
                    } else {
                      return `$${value}`;
                    }
                  }}
                />
                <Tooltip 
                  formatter={(value: number) => [formatTooltipValue(value), "Pipeline Value"]}
                  labelFormatter={(timestamp: number) => {
                    return new Date(timestamp).toLocaleDateString('en-US', { 
                      year: 'numeric',
                      month: 'short', 
                      day: 'numeric',
                      timeZone: 'UTC'
                    });
                  }}
                  labelStyle={{ color: '#666' }}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #ccc', 
                    borderRadius: '6px' 
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-lg font-medium mb-2">No data available</p>
                <p className="text-sm">Upload pipeline files to see trends</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
