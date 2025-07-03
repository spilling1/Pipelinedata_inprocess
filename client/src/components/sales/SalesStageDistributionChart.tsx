import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { SalesFilterState } from "@/types/sales";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";

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
  const [displayMode, setDisplayMode] = useState<'chart' | 'table'>('chart');
  const chartRef = useRef<HTMLDivElement>(null);
  
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['/api/sales/analytics', filters],
    staleTime: 300000, // 5 minutes
  });

  // Memoize stage order for consistent sorting (must be before early return)
  const stageOrder = useMemo(() => [
    'Validation/Introduction',
    'Discover',
    'Developing Champions',
    'ROI Analysis/Pricing',
    'Negotiation/Review'
  ], []);

  const chartData = useMemo(() => {
    if (!analytics?.stageDistribution || !Array.isArray(analytics.stageDistribution)) {
      return [];
    }
    
    // Data is already filtered on the backend, no need to filter closed stages
    const activeStageData = analytics.stageDistribution;

    // Sort stages according to the defined order
    const sortedStageData = activeStageData.sort((a: any, b: any) => {
      const indexA = stageOrder.indexOf(a.stage);
      const indexB = stageOrder.indexOf(b.stage);
      
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      } else if (indexA !== -1) {
        return -1; // a comes first
      } else if (indexB !== -1) {
        return 1; // b comes first
      } else {
        return a.stage.localeCompare(b.stage); // alphabetical for unknown stages
      }
    });

    return sortedStageData.map((item: any, index: number) => ({
      name: item.stage,
      count: item.count,
      value: item.value,
      displayValue: item.count, // Always show count (number of opportunities)
      color: COLORS[index % COLORS.length],
      formattedValue: item.value >= 1000000 
        ? `$${(item.value / 1000000).toFixed(1)}M`
        : item.value >= 1000
        ? `$${(item.value / 1000).toFixed(0)}K`
        : `$${item.value}`
    }));
  }, [analytics?.stageDistribution, stageOrder]);

  // No automatic fallback detection - let user choose display mode

  // Memoize tooltip formatting function (must be before early return)
  const formatTooltipValue = useCallback((value: number, name: string) => {
    return [`${value} opportunities`, 'Count']; // Always show count format
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Stage Distribution</CardTitle>
            <div className="flex space-x-2">
              <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-gray-100 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            Count: {data.count} opportunities
          </p>
          <p className="text-sm text-gray-600">
            Value: {data.formattedValue}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Stage Distribution</CardTitle>
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant={displayMode === 'chart' ? 'default' : 'outline'}
              onClick={() => setDisplayMode('chart')}
            >
              Chart
            </Button>
            <Button
              size="sm"
              variant={displayMode === 'table' ? 'default' : 'outline'}
              onClick={() => setDisplayMode('table')}
            >
              Table
            </Button>
          </div>
        </div>
        {filters.salesRep !== 'all' && (
          <p className="text-sm text-muted-foreground">For {filters.salesRep}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-96" style={{ width: '100%', height: '384px' }}>
          {chartData.length > 0 ? (
            displayMode === 'table' ? (
              // Table view selected by user
              <div className="h-full overflow-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Stage</th>
                      <th className="text-right p-2">Count</th>
                      <th className="text-right p-2">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((item, index) => (
                      <tr key={`row-${index}`} className="border-b">
                        <td className="p-2 flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: item.color }}
                          ></div>
                          {item.name}
                        </td>
                        <td className="text-right p-2">{item.count}</td>
                        <td className="text-right p-2">{item.formattedValue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 text-sm text-gray-500 text-center">
                  Table view - Switch to Chart view above
                </div>
              </div>
            ) : (
              <div ref={chartRef} className="relative">
                <div style={{ width: '100%', height: '350px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="45%"
                        innerRadius={70}
                        outerRadius={140}
                        paddingAngle={2}
                        dataKey="displayValue"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Custom Legend with uniform small dots */}
                <div className="flex flex-wrap justify-center gap-4 mt-2 text-xs">
                  {chartData.map((entry, index) => (
                    <div key={`legend-${index}`} className="flex items-center gap-1">
                      <div 
                        className="w-2 h-2 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-gray-700">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              No data available for the selected filters
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}