import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { SalesFilterState } from "@/types/sales";

interface SalesPipelineValueChartProps {
  filters: SalesFilterState;
}

export default function SalesPipelineValueChart({ filters }: SalesPipelineValueChartProps) {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['/api/sales/analytics', filters],
    staleTime: 300000, // 5 minutes
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Value Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
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

  const chartData = pipelineData.map(item => ({
    ...item,
    date: typeof item.date === 'string' ? item.date : item.date.toISOString().split('T')[0],
    formattedDate: format(parseISO(typeof item.date === 'string' ? item.date : item.date.toISOString().split('T')[0]), 'MMM dd')
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Value Over Time</CardTitle>
        {filters.salesRep !== 'all' && (
          <p className="text-sm text-muted-foreground">For {filters.salesRep}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
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
                formatter={(value: number) => [formatCurrency(value), 'Pipeline Value']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#8884d8" 
                strokeWidth={2}
                dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}