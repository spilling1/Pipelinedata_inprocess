import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, TrendingDown } from "lucide-react";
import { SalesFilterState } from "@/types/sales";

interface SalesStageTimingCardProps {
  filters: SalesFilterState;
}

export default function SalesStageTimingCard({ filters }: SalesStageTimingCardProps) {
  // Build query parameters
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value && (Array.isArray(value) ? value.length > 0 : true)) {
      if (Array.isArray(value)) {
        queryParams.append(key, value.join(','));
      } else {
        queryParams.append(key, value.toString());
      }
    }
  });

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['/api/sales/analytics', queryParams.toString()],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Sales Stage Timing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const stageTimingData = analytics?.stageTimingData || [];

  const formatDays = (days: number) => {
    if (days >= 30) {
      return `${Math.round(days / 30)}mo`;
    } else {
      return `${Math.round(days)}d`;
    }
  };

  const getTimingColor = (days: number) => {
    if (days <= 30) return 'bg-green-100 text-green-800';
    if (days <= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Sales Stage Timing
          {filters.salesRep !== 'all' && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              - {filters.salesRep}
            </span>
          )}
        </CardTitle>
        <p className="text-sm text-gray-600">
          Average time spent in each sales stage
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stageTimingData.length > 0 ? (
            stageTimingData.map((stage: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{stage.stage}</span>
                    <Badge className={getTimingColor(stage.avgDays)}>
                      {formatDays(stage.avgDays)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{stage.dealCount} deals</span>
                    <span>Avg: {stage.avgDays.toFixed(1)} days</span>
                    {stage.change && (
                      <div className={`flex items-center gap-1 ${
                        stage.change > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {stage.change > 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span>{Math.abs(stage.change).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No stage timing data available for the selected filters
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}