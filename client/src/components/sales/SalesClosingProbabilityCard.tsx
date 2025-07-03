import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, Percent } from "lucide-react";
import { SalesFilterState } from "@/types/sales";

interface SalesClosingProbabilityCardProps {
  filters: SalesFilterState;
}

export default function SalesClosingProbabilityCard({ filters }: SalesClosingProbabilityCardProps) {
  const { data: probabilityData, isLoading } = useQuery({
    queryKey: ['/api/sales/closing-probability', filters],
    staleTime: 300000, // 5 minutes
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Closing Probability</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  const closingProbability = probabilityData?.closingProbabilityData || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Closing Probability</CardTitle>
        <Target className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {closingProbability.slice(0, 3).map((stage: any, index: number) => (
            <div key={stage.stage} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant={stage.winRate > 0.5 ? "default" : stage.winRate > 0.25 ? "secondary" : "outline"}>
                  {stage.stage}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {stage.totalDeals} deals
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-sm font-medium">{Math.round(stage.winRate * 100)}%</span>
                <Percent className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
        {closingProbability.length > 3 && (
          <div className="pt-2 mt-2 border-t">
            <span className="text-xs text-muted-foreground">
              +{closingProbability.length - 3} more stages
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}