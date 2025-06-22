import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingDown, AlertCircle, DollarSign, PieChart, BarChart3, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState } from "react";

interface LossReasonData {
  reason: string;
  count: number;
  totalValue: number;
  percentage: number;
}

type DateRangeOption = 'All Time' | 'Last 1 Month' | 'Last 3 months' | 'Last 6 months' | 'Last 12 months' | 'Month to Date' | 'FQ to Date' | 'FY to Date' | 'Last FQ' | 'Last FY' | 'Custom';

const CustomXAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const text = payload.value;
  const maxWidth = 60;
  const lineHeight = 12;
  
  // Break text at specific characters or natural breaks
  const words = text.split(/[\s\-\/]+/);
  const lines: string[] = [];
  let currentLine = '';
  
  words.forEach((word: string) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    // Estimate text width more accurately
    if (testLine.length * 5.5 > maxWidth) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        // Split long single words
        if (word.length > 12) {
          lines.push(word.substring(0, 10) + '...');
        } else {
          lines.push(word);
        }
        currentLine = '';
      }
    } else {
      currentLine = testLine;
    }
  });
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line, index) => (
        <text
          key={index}
          x={0}
          y={index * lineHeight + 5}
          textAnchor="middle"
          fontSize={11}
          fill="#666"
        >
          {line}
        </text>
      ))}
    </g>
  );
};

export function LossReasonOverview() {
  const [selectedRange, setSelectedRange] = useState<DateRangeOption>('FY to Date');
  const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart');

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

  const { data: lossReasons, isLoading } = useQuery<LossReasonData[]>({
    queryKey: ['/api/analytics/loss-reasons', dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.startDate && dateRange.endDate) {
        params.append('startDate', dateRange.startDate);
        params.append('endDate', dateRange.endDate);
      }
      const url = params.toString() ? `/api/analytics/loss-reasons?${params.toString()}` : '/api/analytics/loss-reasons';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch loss reasons');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Loss Reason Overview
          </CardTitle>
          <CardDescription>
            Why deals are lost by reason
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

  if (!lossReasons || lossReasons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Loss Reason Overview
          </CardTitle>
          <CardDescription>
            Why deals are lost by reason
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No Loss Reason Data Available</p>
            <p className="text-sm mt-2">
              Loss reasons will appear here when deals with loss/DQ reasons are uploaded
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for bar chart
  const barData = lossReasons.map((reason, index) => ({
    name: reason.reason || "No reason specified", // Use full name instead of truncated
    fullName: reason.reason || "No reason specified",
    deals: Math.round(reason.count),
    value: Math.round(reason.count),
    totalValue: reason.totalValue,
    percentage: reason.percentage
  }));

  // Debug logging to check data
  console.log('Loss reason data:', lossReasons);
  console.log('Bar chart data:', barData);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium text-sm">{data.fullName || label}</p>
          <p className="text-blue-600 text-sm">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {data.deals || payload[0].value} deals ({data.percentage?.toFixed(1)}%)
            </span>
          </p>
          {data.totalValue && (
            <p className="text-green-600 text-sm">
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                ${(data.totalValue / 1000000).toFixed(1)}M lost value
              </span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              Lost Deal Count
            </CardTitle>
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
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('chart')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'chart' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <BarChart3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <PieChart className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'chart' ? (
          <div className="space-y-3 p-2">
            {barData.map((item, index) => {
              const maxValue = Math.max(...barData.map(d => d.value));
              const barWidth = (item.value / maxValue) * 100;
              
              return (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-700 font-medium flex-1" title={item.fullName}>
                      {item.name}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="w-full bg-gray-200 rounded-sm h-6">
                      <div 
                        className="bg-red-500 h-6 rounded-sm transition-all duration-300 flex items-center justify-end pr-2"
                        style={{ width: `${barWidth}%` }}
                      >
                        <span className="text-white text-xs font-medium">
                          {item.value}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {lossReasons.map((reason, index) => {
              const maxPercentage = Math.max(...lossReasons.map(r => r.percentage));
              const barWidth = (reason.percentage / maxPercentage) * 100;
              
              return (
                <div key={index} className="group p-4 border rounded-xl hover:shadow-md transition-all duration-200 bg-gradient-to-r from-white to-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {reason.reason || "No reason specified"}
                      </h4>
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <span className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          <Users className="h-3.5 w-3.5" />
                          {reason.count} deals
                        </span>
                        <span className="flex items-center gap-1.5">
                          <DollarSign className="h-3.5 w-3.5" />
                          ${(reason.totalValue / 1000).toFixed(0)}K lost
                        </span>
                        <Badge variant="destructive" className="text-xs font-medium">
                          {reason.percentage.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div 
                        className="h-3 bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-700 ease-out group-hover:from-red-600 group-hover:to-red-700"
                        style={{ 
                          width: `${barWidth}%`,
                          boxShadow: '0 0 10px rgba(239, 68, 68, 0.3)'
                        }}
                      />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-end pr-2">
                      <span className="text-xs font-medium text-white drop-shadow-sm">
                        {reason.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}