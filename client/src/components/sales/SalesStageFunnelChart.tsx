import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Filter, TrendingDown } from "lucide-react";
import { SalesFilterState } from "@/types/sales";

interface SalesStageFunnelChartProps {
  filters: SalesFilterState;
}

export default function SalesStageFunnelChart({ filters }: SalesStageFunnelChartProps) {
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
            <Filter className="h-5 w-5" />
            Sales Stage Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const stageFunnelData = analytics?.stageFunnel || [];

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value?.toFixed(0) || 0}`;
    }
  };

  const getStageColor = (index: number, total: number) => {
    const intensity = 1 - (index / total);
    return `bg-blue-${Math.max(100, Math.round(intensity * 500))}`;
  };

  const getConversionColor = (rate: number) => {
    if (rate >= 0.7) return 'text-green-600';
    if (rate >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const maxCount = Math.max(...stageFunnelData.map((stage: any) => stage.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-blue-500" />
          Sales Stage Funnel
          {filters.salesRep !== 'all' && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              - {filters.salesRep}
            </span>
          )}
        </CardTitle>
        <p className="text-sm text-gray-600">
          Opportunity progression through sales stages
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stageFunnelData.length > 0 ? (
            stageFunnelData.map((stage: any, index: number) => {
              const widthPercent = (stage.count / maxCount) * 100;
              const nextStage = stageFunnelData[index + 1];
              const conversionRate = nextStage ? stage.count / nextStage.count : null;
              
              return (
                <div key={index} className="space-y-2">
                  <div className="relative">
                    {/* Funnel bar */}
                    <div className="bg-gray-200 rounded-lg h-12 relative overflow-hidden">
                      <div 
                        className="bg-blue-500 h-full rounded-lg flex items-center justify-between px-4 transition-all duration-300"
                        style={{ width: `${widthPercent}%` }}
                      >
                        <span className="text-white font-medium text-sm">
                          {stage.stage}
                        </span>
                        <span className="text-white text-sm">
                          {stage.count}
                        </span>
                      </div>
                    </div>
                    
                    {/* Stage details */}
                    <div className="flex items-center justify-between mt-1">
                      <div className="text-xs text-gray-600">
                        {formatCurrency(stage.value)} total value
                      </div>
                      <div className="text-xs text-gray-600">
                        Avg: {formatCurrency(stage.avgValue)} per deal
                      </div>
                    </div>
                  </div>
                  
                  {/* Conversion rate to next stage */}
                  {conversionRate && index < stageFunnelData.length - 1 && (
                    <div className="flex items-center justify-center py-1">
                      <div className="flex items-center gap-2 text-xs">
                        <TrendingDown className="h-3 w-3 text-gray-400" />
                        <span className={`font-medium ${getConversionColor(conversionRate)}`}>
                          {(conversionRate * 100).toFixed(1)}% conversion
                        </span>
                        <Badge variant="outline" className="text-xs">
                          -{stage.count - nextStage.count} dropped
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Filter className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No funnel data available</p>
              <p className="text-sm">Add opportunities to see stage progression</p>
            </div>
          )}
        </div>
        
        {stageFunnelData.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Total Opportunities:</span>
                <span className="ml-2">{stageFunnelData[0]?.count || 0}</span>
              </div>
              <div>
                <span className="font-medium">Overall Conversion:</span>
                <span className="ml-2 text-green-600">
                  {stageFunnelData.length > 1 ? 
                    ((stageFunnelData[stageFunnelData.length - 1]?.count / stageFunnelData[0]?.count) * 100).toFixed(1) : 0
                  }%
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}