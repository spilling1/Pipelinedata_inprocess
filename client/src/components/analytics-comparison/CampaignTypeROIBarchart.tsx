import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CampaignTypeData {
  campaignType: string;
  totalCampaigns: number;
  totalCost: number;
  totalCustomers: number;
  totalPipelineValue: number;
  totalClosedWonValue: number;
  averageWinRate: number;
  averageROI: number;
  costEfficiency: number;
  attendeeEfficiency: number;
}

interface CampaignTypeROIBarchartProps {
  data: CampaignTypeData[];
}

const CampaignTypeROIBarchart: React.FC<CampaignTypeROIBarchartProps> = ({ data }) => {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      name: item.campaignType,
      roi: isNaN(item.averageROI) ? 0 : Math.round(item.averageROI * 10) / 10, // Round to 1 decimal
      cost: item.totalCost || 0,
      winRate: isNaN(item.averageWinRate) ? 0 : Math.round(item.averageWinRate * 10) / 10,
      pipelineCostRatio: isNaN(item.costEfficiency) ? 0 : Math.round(item.costEfficiency * 10) / 10,
      campaigns: item.totalCampaigns || 0,
      customers: item.totalCustomers,
      pipelineValue: item.totalPipelineValue,
      closedWonValue: item.totalClosedWonValue
    })).sort((a, b) => b.roi - a.roi); // Sort by ROI descending
  }, [data]);

  const getBarColor = (roi: number) => {
    if (roi >= 500) return '#22c55e'; // Green for excellent performance
    if (roi >= 200) return '#3b82f6'; // Blue for good performance
    if (roi >= 100) return '#f59e0b'; // Yellow for moderate performance
    return '#ef4444'; // Red for poor performance
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-4 max-w-xs">
          <h4 className="font-semibold text-foreground mb-2">{label}</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ROI:</span>
              <span className="font-medium">{data.roi}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Cost:</span>
              <span className="font-medium">{formatCurrency(data.cost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Win Rate:</span>
              <span className="font-medium">{data.winRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pipeline/Cost:</span>
              <span className="font-medium">{data.pipelineCostRatio.toFixed(1)}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Campaigns:</span>
              <span className="font-medium">{data.campaigns}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customers:</span>
              <span className="font-medium">{data.customers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pipeline:</span>
              <span className="font-medium">{formatCurrency(data.pipelineValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Closed Won:</span>
              <span className="font-medium">{formatCurrency(data.closedWonValue)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomBar = (props: any) => {
    const { x, y, width, height, payload } = props;
    
    // Ensure all values are valid numbers
    if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height) || !payload) {
      return null;
    }
    
    const color = getBarColor(payload.roi || 0);
    const isOverMax = (payload.roi || 0) > 2500;
    
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={color}
          rx={4}
          ry={4}
          className="hover:opacity-80 transition-opacity"
        />
        {isOverMax && (
          <g>
            {/* Arrow pointing up to indicate value exceeds chart */}
            <polygon
              points={`${x + width/2 - 6},10 ${x + width/2 + 6},10 ${x + width/2},0`}
              fill={color}
              stroke="white"
              strokeWidth="1"
            />
            {/* Small text indicator */}
            <text
              x={x + width/2}
              y={-3}
              textAnchor="middle"
              fontSize="12"
              fill={color}
              fontWeight="bold"
            >
              {Math.round(payload.roi)}%
            </text>
          </g>
        )}
      </g>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Campaign Type ROI Performance
        </CardTitle>
        <CardDescription>
          Return on investment by campaign type with detailed performance metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 40, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={80}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                domain={[0, 2500]}
                ticks={[0, 500, 1000, 1500, 2000, 2500]}
                tickFormatter={(value) => `${value}%`}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="roi" 
                shape={<CustomBar />}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Excellent (≥500%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Good (200-499%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span>Moderate (100-199%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Poor (&lt;100%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CampaignTypeROIBarchart;