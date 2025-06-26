import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, CalendarDays } from "lucide-react";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { SalesFilterState } from "@/types/sales";

interface SalesPipelineValueChartProps {
  filters: SalesFilterState;
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
      
    case 'currentfy':
      // Current fiscal year (Feb 1 to Jan 31)
      const fyStart = new Date(currentFiscalYear, 1, 1); // Feb 1
      return {
        startDate: fyStart.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      };
      
    case 'previousfy':
      // Previous fiscal year
      const prevFyStart = new Date(currentFiscalYear - 1, 1, 1); // Feb 1 of previous year
      const prevFyEnd = new Date(currentFiscalYear, 0, 31); // Jan 31 of current year
      return {
        startDate: prevFyStart.toISOString().split('T')[0],
        endDate: prevFyEnd.toISOString().split('T')[0]
      };
      
    default:
      return {
        startDate: '',
        endDate: ''
      };
  }
};

export default function SalesPipelineValueChart({ filters }: SalesPipelineValueChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('last3months');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [showCustomRange, setShowCustomRange] = useState(false);

  // Get date range based on selection
  const dateRange = selectedPeriod === 'custom' 
    ? { startDate: customRange.start, endDate: customRange.end }
    : getFiscalDateRange(selectedPeriod);

  // Build query parameters
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value && (Array.isArray(value) ? value.length > 0 : true)) {
      if (Array.isArray(value)) {
        queryParams.append(key, value.join(','));
      } else {
        queryParams.append(key, value.toString());
      }
    }
  });
  
  if (dateRange.startDate) queryParams.append('startDate', dateRange.startDate);
  if (dateRange.endDate) queryParams.append('endDate', dateRange.endDate);

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['/api/sales/analytics', queryParams.toString()],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales Pipeline Value Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  const pipelineData = analytics?.pipelineValueByDate || [];
  
  // Format data for chart
  const chartData = pipelineData.map((item: any) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
    value: item.value,
    fullDate: item.date
  }));

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value}`;
    }
  };

  const periodOptions = [
    { value: 'last1month', label: 'Last 1 Month' },
    { value: 'last3months', label: 'Last 3 Months' },
    { value: 'last6months', label: 'Last 6 Months' },
    { value: 'last12months', label: 'Last 12 Months' },
    { value: 'currentfy', label: 'Current FY' },
    { value: 'previousfy', label: 'Previous FY' },
    { value: 'custom', label: 'Custom Range' }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            Sales Pipeline Value Over Time
            {filters.salesRep !== 'all' && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                - {filters.salesRep}
              </span>
            )}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedPeriod === 'custom' && (
              <Popover open={showCustomRange} onOpenChange={setShowCustomRange}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Calendar className="w-4 h-4 mr-2" />
                    Custom
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="start-date">Start Date</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={customRange.start}
                        onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-date">End Date</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={customRange.end}
                        onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                      />
                    </div>
                    <Button 
                      onClick={() => setShowCustomRange(false)}
                      className="w-full"
                    >
                      Apply Range
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
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tickFormatter={formatValue}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value: number) => [formatValue(value), 'Pipeline Value']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#22c55e" 
                strokeWidth={2}
                dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}