import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { SalesFilterState } from "@/types/sales";
import { useState } from "react";

interface SalesStageDistributionChartProps {
  filters: SalesFilterState;
}

const COLORS = [
  '#9E9E9E', // Gray for Prospecting
  '#FFC107', // Amber for Qualification  
  '#2196F3', // Blue for Proposal
  '#4CAF50', // Green for Negotiation
  '#FF5722', // Deep Orange for additional stages
  '#9C27B0', // Purple for additional stages
];

export default function SalesStageDistributionChart({ filters }: SalesStageDistributionChartProps) {
  const [viewMode, setViewMode] = useState<'count' | 'value'>('count');
  
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

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['/api/sales/analytics', queryParams.toString()],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Sales Stage Distribution
              {filters.salesRep !== 'all' && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  - {filters.salesRep}
                </span>
              )}
            </CardTitle>
            <div className="flex space-x-2">
              <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  const stageData = analytics?.stageDistribution || [];
  
  // Filter out closed stages only
  const activeStageData = stageData.filter((item: any) => 
    !item.stage.toLowerCase().includes('closed')
  );

  // Prepare data for pie chart
  const chartData = activeStageData.map((item: any, index: number) => ({
    name: item.stage,
    value: viewMode === 'count' ? item.count : item.value,
    color: COLORS[index % COLORS.length],
    count: item.count,
    totalValue: item.value
  }));

  const formatValue = (value: number) => {
    if (viewMode === 'count') {
      return value.toString();
    }
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value}`;
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-gray-600">
            Count: {data.count}
          </p>
          <p className="text-sm text-gray-600">
            Value: {formatValue(data.totalValue)}
          </p>
        </div>
      );
    }
    return null;
  };

  const totalCount = chartData.reduce((sum, item) => sum + item.count, 0);
  const totalValue = chartData.reduce((sum, item) => sum + item.totalValue, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            Sales Stage Distribution
            {filters.salesRep !== 'all' && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                - {filters.salesRep}
              </span>
            )}
          </CardTitle>
          <div className="flex space-x-2">
            <Button
              variant={viewMode === 'count' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('count')}
            >
              Count
            </Button>
            <Button
              variant={viewMode === 'value' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('value')}
            >
              Value
            </Button>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          Total: {totalCount} opportunities • {formatValue(totalValue)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No data available for the selected filters
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}