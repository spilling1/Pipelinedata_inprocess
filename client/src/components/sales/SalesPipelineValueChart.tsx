import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
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
      twelveMonthsAgo.setMonth(currentMonth - 12);
      return {
        startDate: twelveMonthsAgo.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      };
      
    case 'fytodate':
    default:
      // Current fiscal year to date (Feb 1 - today)
      const fyStart = new Date(currentFiscalYear, 1, 1); // Feb 1
      return {
        startDate: fyStart.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      };
  }
};

export default function SalesPipelineValueChart({ filters }: SalesPipelineValueChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('fytodate');
  
  // Create chart filters with the selected time period
  const getChartFilters = () => {
    return {
      ...filters,
      ...getFiscalDateRange(selectedPeriod)
    };
  };

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['/api/sales/analytics', getChartFilters()],
    staleTime: 300000, // 5 minutes
  });

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

  const pipelineData = analytics?.pipelineValueByDate || [];

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value.toLocaleString()}`;
    }
  };

  // Transform data for the chart
  const chartData = pipelineData.map((item: any) => ({
    value: item.value,
    date: typeof item.date === 'string' ? item.date : item.date.toISOString().split('T')[0],
    formattedDate: format(parseISO(typeof item.date === 'string' ? item.date : item.date.toISOString().split('T')[0]), 'MMM dd')
  }));

  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value);
  };

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
                <SelectItem value="fytodate">FY to Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {filters.salesRep !== 'all' && (
          <p className="text-sm text-muted-foreground">For {filters.salesRep}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="formattedDate" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={formatCurrency}
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), 'Pipeline Value']}
                labelFormatter={(label) => `Date: ${label}`}
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
        </div>
      </CardContent>
    </Card>
  );
}