import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Calendar, TrendingUp } from "lucide-react";
import { SalesFilterState } from "@/types/sales";

interface SalesFiscalYearPipelineChartProps {
  filters: SalesFilterState;
}

export default function SalesFiscalYearPipelineChart({ filters }: SalesFiscalYearPipelineChartProps) {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['/api/sales/analytics', filters],
    staleTime: 300000, // 5 minutes
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Fiscal Year Pipeline</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  const fiscalYearData = analytics?.fiscalYearPipeline || [];

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value.toLocaleString()}`;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Fiscal Year Pipeline</CardTitle>
        <Calendar className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fiscalYearData}>
              <XAxis 
                dataKey="fiscalYear" 
                tick={{ fontSize: 10 }}
                interval={0}
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                tickFormatter={formatValue}
              />
              <Tooltip 
                formatter={(value: number) => [formatValue(value), "Pipeline Value"]}
                labelStyle={{ color: '#000' }}
              />
              <Bar 
                dataKey="value" 
                fill="#3b82f6" 
                name="Pipeline Value"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}