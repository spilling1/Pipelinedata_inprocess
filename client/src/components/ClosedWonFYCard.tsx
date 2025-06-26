import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from "lucide-react";
import { FilterState } from "@/types/pipeline";
import { getDateRangeByValue } from "@/utils/dateRanges";
import { useMemo, useState } from "react";

interface ClosedWonFYCardProps {
  filters: FilterState;
}

export default function ClosedWonFYCard({ filters }: ClosedWonFYCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
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

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const closedWonValue = fyClosedWonData?.totalValue || 0;
  const closedWonCount = fyClosedWonData?.totalCount || 0;
  const avgDealSize = closedWonCount > 0 ? closedWonValue / closedWonCount : 0;
  const growth = fyClosedWonData?.growth || 0;
  const deals = fyClosedWonData?.deals || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Trophy className="h-4 w-4 text-green-600" />
          Closed Won FY to Date
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Main Value with Inline Metrics */}
        <div className="space-y-2">
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(closedWonValue)}
          </div>
          
          {/* Growth and Key Metrics in same row */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-gray-600">
              {growth !== 0 && (
                <>
                  {growth > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={growth > 0 ? "text-green-600" : "text-red-600"}>
                    {growth > 0 ? '+' : ''}{growth.toFixed(1)}%
                  </span>
                  <span className="text-gray-500">vs last FY</span>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <div>
                <span className="text-gray-500">Deals:</span>{' '}
                <span className="font-semibold text-gray-900">{closedWonCount}</span>
              </div>
              <div>
                <span className="text-gray-500">Avg:</span>{' '}
                <span className="font-semibold text-gray-900">{formatCurrency(avgDealSize)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Deal Details */}
        {deals.length > 0 && (
          <div className="pt-2 border-t">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center justify-between w-full text-left hover:bg-gray-50 rounded p-1 -m-1"
            >
              <span className="text-sm font-medium text-gray-700">
                Recent Wins ({deals.length})
              </span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </button>
            
            {isExpanded && (
              <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                {deals.slice(0, 15).map((deal: any, index: number) => (
                  <div key={index} className="flex justify-between items-start text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {deal.opportunityName}
                      </div>
                      {deal.clientName && (
                        <div className="text-gray-500 truncate">
                          {deal.clientName}
                        </div>
                      )}
                      <div className="text-gray-400">
                        {formatDate(deal.closeDate)}
                      </div>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <div className="font-semibold text-green-600">
                        {formatCurrency(deal.value)}
                      </div>
                    </div>
                  </div>
                ))}
                {deals.length > 15 && (
                  <div className="text-xs text-gray-500 text-center pt-1">
                    +{deals.length - 15} more deals
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}