import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingUp, TrendingDown } from "lucide-react";
import { FilterState } from "@/types/pipeline";
import { getDateRangeByValue } from "@/utils/dateRanges";
import { useMemo } from "react";

interface ClosedWonFYCardProps {
  filters: FilterState;
}

export default function ClosedWonFYCard({ filters }: ClosedWonFYCardProps) {
  // Calculate FY to Date range
  const fyDateRange = useMemo(() => {
    return getDateRangeByValue("fy-to-date");
  }, []);

  // Query for closed won data with FY to Date range
  const { data: fyClosedWonData, isLoading } = useQuery({
    queryKey: ['/api/closed-won-fy', fyDateRange.startDate?.toISOString(), fyDateRange.endDate?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (fyDateRange.startDate) {
        params.append('startDate', fyDateRange.startDate.toISOString().split('T')[0]);
      }
      if (fyDateRange.endDate) {
        params.append('endDate', fyDateRange.endDate.toISOString().split('T')[0]);
      }
      
      const response = await fetch(`/api/closed-won-fy?${params}`);
      if (!response.ok) throw new Error('Failed to fetch closed won data');
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Closed Won FY to Date
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value.toFixed(0)}`;
    }
  };

  const closedWonValue = fyClosedWonData?.totalValue || 0;
  const closedWonCount = fyClosedWonData?.totalCount || 0;
  const avgDealSize = closedWonCount > 0 ? closedWonValue / closedWonCount : 0;
  const growth = fyClosedWonData?.growth || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Trophy className="h-5 w-5 text-green-600" />
          Closed Won FY to Date
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(closedWonValue)}
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
            {growth !== 0 && (
              <>
                {growth > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className={growth > 0 ? "text-green-600" : "text-red-600"}>
                  {growth > 0 ? '+' : ''}{growth.toFixed(1)}%
                </span>
                <span className="text-gray-500">vs last FY</span>
              </>
            )}
          </div>
        </div>
        
        <div className="space-y-2 pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Deals Closed:</span>
            <span className="font-semibold">{closedWonCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Avg Deal Size:</span>
            <span className="font-semibold">{formatCurrency(avgDealSize)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}