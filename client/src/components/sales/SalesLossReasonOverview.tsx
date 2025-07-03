import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { AlertTriangle, TrendingDown } from "lucide-react";
import { SalesFilterState } from "@/types/sales";

interface SalesLossReasonOverviewProps {
  filters: SalesFilterState;
}

export default function SalesLossReasonOverview({ filters }: SalesLossReasonOverviewProps) {
  const { data: lossData, isLoading } = useQuery({
    queryKey: ['/api/sales/loss-analysis', filters],
    staleTime: 300000, // 5 minutes
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Loss Reason Overview</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  const lossReasons = lossData?.lossReasons || [];

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
        <CardTitle className="text-sm font-medium">Loss Reason Overview</CardTitle>
        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={lossReasons}>
              <XAxis 
                dataKey="reason" 
                tick={{ fontSize: 8 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tick={{ fontSize: 10 }}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  name === "count" ? value : formatValue(value), 
                  name === "count" ? "Deals" : "Total Value"
                ]}
                labelStyle={{ color: '#000' }}
              />
              <Bar 
                dataKey="count" 
                fill="#ef4444" 
                name="Deals"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}