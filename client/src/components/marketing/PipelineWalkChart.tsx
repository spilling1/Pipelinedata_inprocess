import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface PipelineWalkChartProps {
  campaignId: number;
  campaignName: string;
}

interface PipelineWalkData {
  date: string;
  pipelineValue: number;
  closedWonValue: number;
  customerCount: number;
}

export default function PipelineWalkChart({ campaignId, campaignName }: PipelineWalkChartProps) {
  const { data: pipelineWalkData = [], isLoading, error } = useQuery<PipelineWalkData[]>({
    queryKey: [`/api/marketing/campaigns/${campaignId}/pipeline-walk`],
    enabled: !!campaignId,
  });

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value.toFixed(0)}`;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Walk Over Time</CardTitle>
          <CardDescription>Pipeline value from campaign start to today for: {campaignName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  if (error || pipelineWalkData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Walk Over Time</CardTitle>
          <CardDescription>Pipeline value from campaign start to today for: {campaignName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            {error ? 'Error loading pipeline data' : 'No pipeline data available'}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const chartData = pipelineWalkData.map(item => ({
    ...item,
    formattedDate: formatDate(item.date),
    formattedPipelineValue: formatCurrency(item.pipelineValue),
    formattedClosedWonValue: formatCurrency(item.closedWonValue),
    totalValue: item.pipelineValue + item.closedWonValue
  }));

  const maxValue = Math.max(...pipelineWalkData.map(d => d.pipelineValue + d.closedWonValue));
  const currentPipelineValue = pipelineWalkData[pipelineWalkData.length - 1]?.pipelineValue || 0;
  const currentClosedWonValue = pipelineWalkData[pipelineWalkData.length - 1]?.closedWonValue || 0;
  const startPipelineValue = pipelineWalkData[0]?.pipelineValue || 0;
  const startClosedWonValue = pipelineWalkData[0]?.closedWonValue || 0;
  
  const totalCurrent = currentPipelineValue + currentClosedWonValue;
  const totalStart = startPipelineValue + startClosedWonValue;
  const changePercent = totalStart > 0 ? ((totalCurrent - totalStart) / totalStart) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Walk Over Time</CardTitle>
        <CardDescription>
          Pipeline value from campaign start to today for: {campaignName}
        </CardDescription>
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-gray-600">Pipeline: </span>
            <span className="font-semibold text-blue-600">{formatCurrency(currentPipelineValue)}</span>
          </div>
          <div>
            <span className="text-gray-600">Closed Won: </span>
            <span className="font-semibold text-green-600">{formatCurrency(currentClosedWonValue)}</span>
          </div>

        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
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
                formatter={(value: number, name: string) => {
                  if (name === 'closedWonValue') return [formatCurrency(value), 'Closed Won'];
                  if (name === 'pipelineValue') return [formatCurrency(value), 'Pipeline'];
                  return [value, name];
                }}
                labelFormatter={(label: string) => {
                  const item = chartData.find(d => d.formattedDate === label);
                  return item ? new Date(item.date).toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  }) : label;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="closedWonValue" 
                stackId="1"
                stroke="#22c55e" 
                fill="#22c55e"
                fillOpacity={0.8}
              />
              <Area 
                type="monotone" 
                dataKey="pipelineValue" 
                stackId="1"
                stroke="#2563eb" 
                fill="#2563eb"
                fillOpacity={0.8}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-xs text-gray-500">
          Shows weekly Year 1 ARR values for customers with entered pipeline dates. Closed Won (green) at bottom, Pipeline (blue) at top.
        </div>
      </CardContent>
    </Card>
  );
}