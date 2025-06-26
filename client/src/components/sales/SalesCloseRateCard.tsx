import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { SalesFilterState } from "@/types/sales";

interface SalesCloseRateCardProps {
  filters: SalesFilterState;
}

export default function SalesCloseRateCard({ filters }: SalesCloseRateCardProps) {
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
            Close Rate Analysis
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

  const closeRateData = analytics?.closeRateAnalysis || {};

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

  const getCloseRateColor = (rate: number) => {
    if (rate >= 0.4) return 'bg-green-100 text-green-800';
    if (rate >= 0.2) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 0.4) return 'bg-green-500';
    if (rate >= 0.2) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const overallCloseRate = closeRateData.overall?.closeRate || 0;
  const totalOpportunities = closeRateData.overall?.totalOpportunities || 0;
  const closedDeals = closeRateData.overall?.closedDeals || 0;
  const avgDaysToClose = closeRateData.overall?.avgDaysToClose || 0;
  const closeRateChange = closeRateData.overall?.change || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-green-500" />
          Close Rate Analysis
          {filters.salesRep !== 'all' && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              - {filters.salesRep}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Overall Close Rate */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-gray-900">Overall Close Rate</span>
              <div className="flex items-center gap-2">
                <Badge className={getCloseRateColor(overallCloseRate)}>
                  {formatPercent(overallCloseRate)}
                </Badge>
                {closeRateChange !== 0 && (
                  <div className={`flex items-center text-xs ${
                    closeRateChange > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {closeRateChange > 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    <span>{Math.abs(closeRateChange).toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
              <div 
                className={`h-3 rounded-full ${getProgressColor(overallCloseRate)}`}
                style={{ width: `${overallCloseRate * 100}%` }}
              ></div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-medium text-gray-900">{totalOpportunities}</div>
                <div className="text-gray-500">Total Opps</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-green-600">{closedDeals}</div>
                <div className="text-gray-500">Closed</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-blue-600">{avgDaysToClose}d</div>
                <div className="text-gray-500">Avg Days</div>
              </div>
            </div>
          </div>

          {/* Close Rate by Time Period */}
          {closeRateData.byTimePeriod && closeRateData.byTimePeriod.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-700">Close Rate Trends</h4>
              {closeRateData.byTimePeriod.map((period: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{period.period}</span>
                      <div className="flex items-center gap-2">
                        <Badge className={getCloseRateColor(period.closeRate)} variant="outline">
                          {formatPercent(period.closeRate)}
                        </Badge>
                        {period.change !== 0 && (
                          <div className={`flex items-center text-xs ${
                            period.change > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {period.change > 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            <span>{Math.abs(period.change).toFixed(1)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {period.closedDeals} closed of {period.totalOpportunities} opportunities
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Close Rate by Stage */}
          {closeRateData.byStage && closeRateData.byStage.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-700">Close Rate by Starting Stage</h4>
              {closeRateData.byStage.map((stage: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{stage.stage}</span>
                      <Badge className={getCloseRateColor(stage.closeRate)} variant="outline">
                        {formatPercent(stage.closeRate)}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500">
                      {stage.closedDeals} closed • {stage.avgDaysToClose}d avg close time
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Performance Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Velocity</span>
              </div>
              <div className="text-lg font-semibold text-blue-900">
                {avgDaysToClose}d
              </div>
              <div className="text-xs text-blue-600">Average close time</div>
            </div>
            
            <div className="p-3 bg-green-50 rounded-lg text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Target className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Success</span>
              </div>
              <div className="text-lg font-semibold text-green-900">
                {formatPercent(overallCloseRate)}
              </div>
              <div className="text-xs text-green-600">Close rate</div>
            </div>
          </div>

          {/* Key Insights */}
          {closeRateData.insights && (
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-purple-900">Performance Insights</span>
              </div>
              <ul className="text-sm text-purple-800 space-y-1">
                {closeRateData.insights.map((insight: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="w-1 h-1 bg-purple-600 rounded-full mt-2 flex-shrink-0"></span>
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