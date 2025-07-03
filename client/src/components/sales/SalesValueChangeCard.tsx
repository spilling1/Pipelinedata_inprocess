import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { SalesFilterState } from "@/types/sales";

interface SalesValueChangeCardProps {
  filters: SalesFilterState;
}

export default function SalesValueChangeCard({ filters }: SalesValueChangeCardProps) {
  const { data: valueChangeData, isLoading } = useQuery({
    queryKey: ['/api/sales/value-changes', filters],
    staleTime: 300000, // 5 minutes
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Value Changes</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  const valueChanges = valueChangeData?.valueChanges || [];

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
        <CardTitle className="text-sm font-medium">Value Changes</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {valueChanges.slice(0, 3).map((change: any, index: number) => (
            <div key={change.opportunityName} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant={change.valueChange > 0 ? "default" : "destructive"}>
                  {change.opportunityName.length > 15 
                    ? change.opportunityName.substring(0, 15) + '...'
                    : change.opportunityName}
                </Badge>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-sm font-medium">{formatCurrency(Math.abs(change.valueChange))}</span>
                {change.valueChange > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
              </div>
            </div>
          ))}
        </div>
        {valueChanges.length > 3 && (
          <div className="pt-2 mt-2 border-t">
            <span className="text-xs text-muted-foreground">
              +{valueChanges.length - 3} more changes
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}