import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingUp, TrendingDown, ChevronDown, ChevronRight } from "lucide-react";
import { FilterState } from "@/types/pipeline";
import { getDateRangeByValue } from "@/utils/dateRanges";
import { useMemo, useState } from "react";

interface ClosedWonFYCardProps {
  filters: FilterState;
}

export default function ClosedWonFYCard({ filters }: ClosedWonFYCardProps) {
  const [expandedDeals, setExpandedDeals] = useState<Set<number>>(new Set());
  
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

  const toggleDeal = (index: number) => {
    const newExpanded = new Set(expandedDeals);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedDeals(newExpanded);
  };

  const closedWonValue = fyClosedWonData?.totalValue || 0;
  const closedWonCount = fyClosedWonData?.totalCount || 0;
  const avgDealSize = closedWonCount > 0 ? closedWonValue / closedWonCount : 0;
  const growth = fyClosedWonData?.growth || 0;
  const deals = fyClosedWonData?.deals || [];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Trophy className="h-4 w-4 text-green-600" />
          Closed Won FY to Date
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {/* Main Value with Deals Count */}
        <div className="flex items-baseline gap-2 mb-2">
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(closedWonValue)}
          </div>
          <div className="text-sm text-gray-600">
            Deals: <span className="font-semibold text-gray-900">{closedWonCount}</span>
          </div>
        </div>
        
        {/* Growth and Average Deal Size */}
        <div className="flex items-center gap-4 text-sm mb-4">
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
          <div className="text-gray-600">
            Avg: <span className="font-semibold text-gray-900">{formatCurrency(avgDealSize)}</span>
          </div>
        </div>

        {/* Individual Deal List - Using full space */}
        {deals.length > 0 && (
          <div className="flex-1 overflow-y-auto space-y-1">
            {deals.map((deal: any, index: number) => (
              <div key={index} className="border-b border-gray-100 last:border-b-0">
                <button
                  onClick={() => toggleDeal(index)}
                  className="w-full flex items-center justify-between p-2 hover:bg-gray-50 text-left"
                >
                  <div className="flex items-center gap-2">
                    {expandedDeals.has(index) ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {deal.opportunityName}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-green-600 ml-2">
                    {formatCurrency(deal.value)}
                  </span>
                </button>
                
                {expandedDeals.has(index) && (
                  <div className="px-8 pb-3 space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Client:</span>
                      <span className="text-gray-900">
                        {deal.clientName || deal.opportunityName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Close Date:</span>
                      <span className="text-gray-900">
                        {formatDate(deal.closeDate)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}