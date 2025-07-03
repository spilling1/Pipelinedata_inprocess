import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Calendar } from "lucide-react";
import { SalesFilterState } from "@/types/sales";

interface SalesClosedWonFYCardProps {
  filters: SalesFilterState;
}

export default function SalesClosedWonFYCard({ filters }: SalesClosedWonFYCardProps) {
  const { data: closedWonData, isLoading } = useQuery({
    queryKey: ['/api/sales/closed-won-fy', filters],
    staleTime: 300000, // 5 minutes
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Closed Won FY</CardTitle>
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  const closedWonFY = closedWonData?.closedWonFY || [];

  const formatCurrency = (value: number) => {
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
        <CardTitle className="text-sm font-medium">Closed Won FY</CardTitle>
        <Trophy className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {closedWonFY.slice(0, 3).map((deal: any, index: number) => (
            <div key={deal.opportunityName} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant={index === 0 ? "default" : "secondary"}>
                  {deal.opportunityName.length > 15 
                    ? deal.opportunityName.substring(0, 15) + '...'
                    : deal.opportunityName}
                </Badge>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-sm font-medium">{formatCurrency(deal.value)}</span>
                <Calendar className="h-3 w-3 text-green-500" />
              </div>
            </div>
          ))}
        </div>
        {closedWonFY.length > 3 && (
          <div className="pt-2 mt-2 border-t">
            <span className="text-xs text-muted-foreground">
              +{closedWonFY.length - 3} more wins
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}