import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';

interface PipelineOverTimeChartProps {
  data: Array<{
    date: string;
    pipelineValue: number;
    closedWonValue: number;
  }>;
  formatCurrency: Intl.NumberFormat;
}

const PipelineOverTimeChart: React.FC<PipelineOverTimeChartProps> = ({
  data,
  formatCurrency
}) => {
  const chartData = useMemo(() => {
    return data.map(item => ({
      ...item,
      formattedDate: format(parseISO(item.date), 'MMM yyyy'),
      displayDate: format(parseISO(item.date), 'MMM yyyy')
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-muted-foreground">
                {entry.name}: {formatCurrency.format(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        <p>No time series data available</p>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="displayDate"
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="pipelineValue" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            name="Pipeline Value"
            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
          />
          <Line 
            type="monotone" 
            dataKey="closedWonValue" 
            stroke="hsl(var(--chart-2))" 
            strokeWidth={2}
            name="Closed Won Value"
            dot={{ fill: 'hsl(var(--chart-2))', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: 'hsl(var(--chart-2))', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PipelineOverTimeChart;