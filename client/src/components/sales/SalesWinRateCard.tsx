import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, TrendingDown, Target } from "lucide-react";
import { SalesFilterState } from "@/types/sales";

interface SalesWinRateCardProps {
  filters: SalesFilterState;
}

export default function SalesWinRateCard({ filters }: SalesWinRateCardProps) {
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
            <Trophy className="h-5 w-5" />
            Win Rate Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const winRateData = analytics?.winRateAnalysis || {};

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value?.toFixed(0) || 0}`;
    }
  };

  const getWinRateColor = (rate: number) => {
    if (rate >= 0.5) return 'bg-green-100 text-green-800';
    if (rate >= 0.3) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 0.5) return 'bg-green-500';
    if (rate >= 0.3) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const overallWinRate = winRateData.overall?.winRate || 0;
  const totalDeals = winRateData.overall?.totalDeals || 0;
  const wonDeals = winRateData.overall?.wonDeals || 0;
  const lostDeals = winRateData.overall?.lostDeals || 0;
  const winRateChange = winRateData.overall?.change || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Win Rate Analysis
          {filters.salesRep !== 'all' && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              - {filters.salesRep}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Overall Win Rate */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-gray-900">Overall Win Rate</span>
              <div className="flex items-center gap-2">
                <Badge className={getWinRateColor(overallWinRate)}>
                  {formatPercent(overallWinRate)}
                </Badge>
                {winRateChange !== 0 && (
                  <div className={`flex items-center text-xs ${
                    winRateChange > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {winRateChange > 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    <span>{Math.abs(winRateChange).toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
              <div 
                className={`h-3 rounded-full ${getProgressColor(overallWinRate)}`}
                style={{ width: `${overallWinRate * 100}%` }}
              ></div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-medium text-gray-900">{totalDeals}</div>
                <div className="text-gray-500">Total Deals</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-green-600">{wonDeals}</div>
                <div className="text-gray-500">Won</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-red-600">{lostDeals}</div>
                <div className="text-gray-500">Lost</div>
              </div>
            </div>
          </div>

          {/* Win Rate by Value Range */}
          {winRateData.byValueRange && winRateData.byValueRange.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-700">Win Rate by Deal Size</h4>
              {winRateData.byValueRange.map((range: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{range.range}</span>
                      <Badge className={getWinRateColor(range.winRate)} variant="outline">
                        {formatPercent(range.winRate)}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500">
                      {range.totalDeals} deals • Won: {range.wonDeals} • Lost: {range.lostDeals}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Win Rate by Stage */}
          {winRateData.byStage && winRateData.byStage.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-700">Historical Win Rate by Stage Reached</h4>
              {winRateData.byStage.map((stage: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{stage.stage}</span>
                      <Badge className={getWinRateColor(stage.winRate)} variant="outline">
                        {formatPercent(stage.winRate)}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500">
                      {stage.totalDeals} deals reached this stage
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Performance Insights */}
          {winRateData.insights && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">Key Insights</span>
              </div>
              <ul className="text-sm text-blue-800 space-y-1">
                {winRateData.insights.map((insight: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="w-1 h-1 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}