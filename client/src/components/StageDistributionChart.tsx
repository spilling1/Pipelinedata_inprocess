import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { FilterState } from "@/types/pipeline";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";

interface StageDistributionChartProps {
  filters: FilterState;
}

const COLORS = [
  '#9E9E9E', // Gray for Prospecting
  '#FFC107', // Amber for Qualification  
  '#2196F3', // Blue for Proposal
  '#4CAF50', // Green for Negotiation
  '#FF5722', // Deep Orange for additional stages
  '#9C27B0', // Purple for additional stages
];

export default function StageDistributionChart({ filters }: StageDistributionChartProps) {
  const [viewMode, setViewMode] = useState<'count' | 'value'>('count');
  const [showFallback, setShowFallback] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  
  const { data: stageData, isLoading } = useQuery({
    queryKey: ['/api/analytics/stage-distribution'],
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
    if (!stageData || !Array.isArray(stageData)) return [];
    
    // Data is already filtered on the backend, no need to filter closed stages
    const activeStageData = stageData;

    // Sort stages according to the defined order
    const sortedStageData = activeStageData.sort((a: any, b: any) => {
      const indexA = stageOrder.indexOf(a.stage);
      const indexB = stageOrder.indexOf(b.stage);
      
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.stage.localeCompare(b.stage);
    });
    
    // Format data for chart
    return sortedStageData.map((item: any, index: number) => ({
      name: item.stage,
      count: item.count,
      value: item.value,
      displayValue: viewMode === 'count' ? item.count : item.value,
      color: COLORS[index % COLORS.length],
      formattedValue: item.value >= 1000000 
        ? `$${(item.value / 1000000).toFixed(1)}M`
        : item.value >= 1000
        ? `$${(item.value / 1000).toFixed(0)}K`
        : `$${item.value}`
    }));
  }, [stageData, viewMode, stageOrder]);

  // Detect if chart failed to render (common on Safari/Mac)
  useEffect(() => {
    if (chartData.length > 0 && !showFallback) {
      const timer = setTimeout(() => {
        if (chartRef.current && chartRef.current.children.length > 0) {
          const svg = chartRef.current.querySelector('svg');
          if (!svg || svg.children.length === 0) {
            setShowFallback(true);
          }
        }
      }, 2000); // Check after 2 seconds

      return () => clearTimeout(timer);
    }
  }, [chartData, showFallback]);

  // Memoize tooltip formatting function (must be before early return)
  const formatTooltipValue = useCallback((value: number, name: string) => {
    if (viewMode === 'count') {
      return [`${value} opportunities`, 'Count'];
    } else {
      if (value >= 1000000) {
        return [`$${(value / 1000000).toFixed(1)}M`, 'Value'];
      } else if (value >= 1000) {
        return [`$${(value / 1000).toFixed(0)}K`, 'Value'];
      } else {
        return [`$${value}`, 'Value'];
      }
    }
  }, [viewMode]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Stage Distribution</CardTitle>
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
              variant={viewMode === 'count' ? 'default' : 'outline'}
              onClick={() => setViewMode('count')}
            >
              Count
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'value' ? 'default' : 'outline'}
              onClick={() => setViewMode('value')}
            >
              Value
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-96" style={{ width: '100%', height: '384px' }}>
          {chartData.length > 0 ? (
            showFallback ? (
              // Fallback table view for when charts don't render (common on Safari/Mac)
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
                  Chart view not available - showing table format
                </div>
              </div>
            ) : (
              <div ref={chartRef}>
                <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={300}>
                  <PieChart width={400} height={400}>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="displayValue"
                      animationBegin={0}
                      animationDuration={800}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      iconType="circle"
                      wrapperStyle={{ 
                        paddingTop: '20px',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-lg font-medium mb-2">No data available</p>
                <p className="text-sm">Upload pipeline files to see stage distribution</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
