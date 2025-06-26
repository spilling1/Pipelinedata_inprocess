import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingDown, AlertCircle } from "lucide-react";
import { SalesFilterState } from "@/types/sales";

interface SalesDateSlippageCardProps {
  filters: SalesFilterState;
}

export default function SalesDateSlippageCard({ filters }: SalesDateSlippageCardProps) {
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
            <Calendar className="h-5 w-5" />
            Date Slippage Analysis
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

  const dateSlippageData = analytics?.dateSlippageData || [];

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value?.toFixed(0) || 0}`;
    }
  };

  const formatDays = (days: number) => {
    if (days >= 30) {
      return `${Math.round(days / 30)}mo`;
    } else {
      return `${Math.round(days)}d`;
    }
  };

  const getSlippageColor = (days: number) => {
    if (days <= 7) return 'bg-green-100 text-green-800';
    if (days <= 30) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const totalSlippedValue = dateSlippageData.reduce((sum: number, stage: any) => sum + stage.totalSlippedValue, 0);
  const avgSlippage = dateSlippageData.reduce((sum: number, stage: any) => sum + stage.avgSlippageDays, 0) / (dateSlippageData.length || 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-orange-500" />
          Date Slippage Analysis
          {filters.salesRep !== 'all' && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              - {filters.salesRep}
            </span>
          )}
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div>
            Total Slipped: {formatCurrency(totalSlippedValue)}
          </div>
          <div>
            Avg Slippage: {formatDays(avgSlippage)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {dateSlippageData.length > 0 ? (
            dateSlippageData.map((stage: any, index: number) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{stage.stageName}</span>
                  <Badge className={getSlippageColor(stage.avgSlippageDays)}>
                    {formatDays(stage.avgSlippageDays)}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 mb-2">
                  <div>
                    <span className="font-medium">Deals:</span> {stage.dealCount}
                  </div>
                  <div>
                    <span className="font-medium">Quarter End Rate:</span> {(stage.quarterEndSlippageRate * 100).toFixed(1)}%
                  </div>
                </div>
                
                <div className="text-xs text-gray-600 mb-2">
                  <span className="font-medium">Total Slipped Value:</span> {formatCurrency(stage.totalSlippedValue)}
                </div>

                {stage.worstCase && (
                  <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                    <div className="flex items-center gap-1 mb-1">
                      <AlertCircle className="h-3 w-3 text-red-500" />
                      <span className="text-xs font-medium text-red-700">Worst Case:</span>
                    </div>
                    <div className="text-xs text-red-600">
                      <div>{stage.worstCase.opportunityName}</div>
                      <div className="flex justify-between mt-1">
                        <span>Slippage: {formatDays(stage.worstCase.slippageDays)}</span>
                        <span>Value: {formatCurrency(stage.worstCase.value)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No date slippage data available</p>
              <p className="text-xs">Close dates may be on track</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}