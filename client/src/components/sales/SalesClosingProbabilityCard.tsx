import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, TrendingDown } from "lucide-react";
import { SalesFilterState } from "@/types/sales";

interface SalesClosingProbabilityCardProps {
  filters: SalesFilterState;
}

export default function SalesClosingProbabilityCard({ filters }: SalesClosingProbabilityCardProps) {
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
            <Target className="h-5 w-5" />
            Closing Probability
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

  const closingProbabilityData = analytics?.closingProbabilityData || [];

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getProbabilityColor = (winRate: number) => {
    if (winRate >= 0.7) return 'bg-green-100 text-green-800';
    if (winRate >= 0.4) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getProgressColor = (winRate: number) => {
    if (winRate >= 0.7) return 'bg-green-500';
    if (winRate >= 0.4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const totalDeals = closingProbabilityData.reduce((sum: number, stage: any) => sum + stage.totalDeals, 0);
  const totalClosedWon = closingProbabilityData.reduce((sum: number, stage: any) => sum + stage.closedWon, 0);
  const overallWinRate = totalDeals > 0 ? totalClosedWon / totalDeals : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-purple-500" />
          Closing Probability
          {filters.salesRep !== 'all' && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              - {filters.salesRep}
            </span>
          )}
        </CardTitle>
        <div className="text-sm text-gray-600">
          Overall Win Rate: {formatPercent(overallWinRate)} ({totalClosedWon}/{totalDeals} deals)
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {closingProbabilityData.length > 0 ? (
            closingProbabilityData.map((stage: any, index: number) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{stage.stage}</span>
                  <Badge className={getProbabilityColor(stage.winRate)}>
                    {formatPercent(stage.winRate)}
                  </Badge>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className={`h-2 rounded-full ${getProgressColor(stage.winRate)}`}
                    style={{ width: `${stage.winRate * 100}%` }}
                  ></div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                  <div>
                    <span className="font-medium">Total:</span> {stage.totalDeals}
                  </div>
                  <div className="text-green-600">
                    <span className="font-medium">Won:</span> {stage.closedWon}
                  </div>
                  <div className="text-red-600">
                    <span className="font-medium">Lost:</span> {stage.closedLost}
                  </div>
                </div>
                
                {stage.conversionToNext > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    <span className="font-medium">Next Stage Conversion:</span> {formatPercent(stage.conversionToNext)}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Target className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No closing probability data available</p>
              <p className="text-xs">Historical data needed for analysis</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}