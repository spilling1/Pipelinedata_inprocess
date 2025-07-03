import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingDown, AlertCircle } from "lucide-react";
import { SalesFilterState } from "@/types/sales";

interface SalesDateSlippageCardProps {
  filters: SalesFilterState;
}

export default function SalesDateSlippageCard({ filters }: SalesDateSlippageCardProps) {
  const { data: slippageData, isLoading } = useQuery({
    queryKey: ['/api/sales/date-slippage', filters],
    staleTime: 300000, // 5 minutes
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Date Slippage Analysis</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  const slippageAnalysis = slippageData?.dateSlippageData || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Date Slippage Analysis</CardTitle>
        <Calendar className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {slippageAnalysis.slice(0, 3).map((stage: any, index: number) => (
            <div key={stage.stageName} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant={stage.avgSlippageDays > 14 ? "destructive" : "secondary"}>
                  {stage.stageName}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {stage.dealCount} deals
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-sm font-medium">{Math.round(stage.avgSlippageDays)}d</span>
                {stage.avgSlippageDays > 14 && (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
              </div>
            </div>
          ))}
        </div>
        {slippageAnalysis.length > 3 && (
          <div className="pt-2 mt-2 border-t">
            <span className="text-xs text-muted-foreground">
              +{slippageAnalysis.length - 3} more stages
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}