import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, AlertCircle } from "lucide-react";
import { SalesFilterState } from "@/types/sales";

interface SalesStageTimingCardProps {
  filters: SalesFilterState;
}

export default function SalesStageTimingCard({ filters }: SalesStageTimingCardProps) {
  const { data: stageTimingData, isLoading } = useQuery({
    queryKey: ['/api/sales/stage-timing', filters],
    staleTime: 300000, // 5 minutes
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Stage Timing Analysis</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  const stageData = stageTimingData?.stageTimingData || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Stage Timing Analysis</CardTitle>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stageData.slice(0, 3).map((stage: any, index: number) => (
            <div key={stage.stage} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant={index === 0 ? "destructive" : index === 1 ? "secondary" : "outline"}>
                  {stage.stage}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {stage.dealCount} deals
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-sm font-medium">{Math.round(stage.avgDays)}d</span>
                {stage.avgDays > 30 && (
                  <AlertCircle className="h-3 w-3 text-yellow-500" />
                )}
              </div>
            </div>
          ))}
        </div>
        {stageData.length > 3 && (
          <div className="pt-2 mt-2 border-t">
            <span className="text-xs text-muted-foreground">
              +{stageData.length - 3} more stages
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}