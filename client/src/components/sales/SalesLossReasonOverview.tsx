import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown } from "lucide-react";
import { SalesFilterState } from "@/types/sales";

interface SalesLossReasonOverviewProps {
  filters: SalesFilterState;
}

export default function SalesLossReasonOverview({ filters }: SalesLossReasonOverviewProps) {
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
            <AlertTriangle className="h-5 w-5" />
            Loss Reasons
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const lossReasonData = analytics?.lossReasons || [];

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value?.toFixed(0) || 0}`;
    }
  };

  const getReasonColor = (percentage: number) => {
    if (percentage >= 30) return 'bg-red-100 text-red-800';
    if (percentage >= 15) return 'bg-orange-100 text-orange-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const totalLostValue = lossReasonData.reduce((sum: number, reason: any) => sum + reason.totalValue, 0);
  const totalLostCount = lossReasonData.reduce((sum: number, reason: any) => sum + reason.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Loss Reasons
          {filters.salesRep !== 'all' && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              - {filters.salesRep}
            </span>
          )}
        </CardTitle>
        <div className="text-sm text-gray-600">
          {totalLostCount} deals • {formatCurrency(totalLostValue)} lost value
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {lossReasonData.length > 0 ? (
            lossReasonData.map((reason: any, index: number) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{reason.reason}</span>
                  <Badge className={getReasonColor(reason.percentage)}>
                    {reason.percentage.toFixed(1)}%
                  </Badge>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full"
                    style={{ width: `${reason.percentage}%` }}
                  ></div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                  <div>
                    <span className="font-medium">Count:</span> {reason.count} deals
                  </div>
                  <div>
                    <span className="font-medium">Value:</span> {formatCurrency(reason.totalValue)}
                  </div>
                </div>
                
                {reason.avgDealSize && (
                  <div className="text-xs text-gray-500 mt-1">
                    Avg deal size: {formatCurrency(reason.avgDealSize)}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No loss data available</p>
              <p className="text-xs">No closed lost opportunities found</p>
            </div>
          )}
        </div>
        
        {lossReasonData.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="font-medium text-red-900">Top Loss Driver</span>
              </div>
              <div className="text-sm text-red-800">
                <div className="font-medium">{lossReasonData[0]?.reason}</div>
                <div className="text-xs">
                  {lossReasonData[0]?.count} deals • {formatCurrency(lossReasonData[0]?.totalValue)} lost
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}