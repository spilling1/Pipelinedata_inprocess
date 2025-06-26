import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GitBranch, BarChart3 } from "lucide-react";
import { SalesFilterState } from "@/types/sales";
import { useState } from "react";

interface SalesSankeyFlowChartProps {
  filters: SalesFilterState;
}

export default function SalesSankeyFlowChart({ filters }: SalesSankeyFlowChartProps) {
  const [timeframe, setTimeframe] = useState<'30' | '60' | '90' | 'all'>('90');

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
  queryParams.append('timeframe', timeframe);

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['/api/sales/stage-flow', queryParams.toString()],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-blue-500" />
            Sales Stage Flow Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-gray-100 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  const stageFlowData = analytics?.stageFlow || [];

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value?.toFixed(0) || 0}`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-blue-500" />
            Sales Stage Flow Analysis
            {filters.salesRep !== 'all' && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                - {filters.salesRep}
              </span>
            )}
          </CardTitle>
          <div className="flex space-x-2">
            {(['30', '60', '90', 'all'] as const).map((period) => (
              <Button
                key={period}
                variant={timeframe === period ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeframe(period)}
              >
                {period === 'all' ? 'All Time' : `${period} Days`}
              </Button>
            ))}
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Stage transitions and deal movement patterns over the last {timeframe === 'all' ? 'all time' : `${timeframe} days`}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stageFlowData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Stage Transition Summary */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-700">Stage Transitions</h4>
                {stageFlowData.map((flow: any, index: number) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{flow.fromStage}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-sm font-medium">{flow.toStage}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {flow.count} deals
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Total Value: {formatCurrency(flow.totalValue)}
                    </div>
                    {flow.avgDays && (
                      <div className="text-xs text-gray-500">
                        Avg Time: {flow.avgDays} days
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Flow Visualization (Simplified) */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-700">Flow Summary</h4>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-900">Pipeline Health</span>
                  </div>
                  
                  {analytics?.flowSummary && (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total Movements:</span>
                        <span className="font-medium">{analytics.flowSummary.totalMovements}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Forward Movements:</span>
                        <span className="font-medium text-green-600">{analytics.flowSummary.forwardMovements}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Backward Movements:</span>
                        <span className="font-medium text-red-600">{analytics.flowSummary.backwardMovements}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>To Closed Won:</span>
                        <span className="font-medium text-green-600">{analytics.flowSummary.closedWon}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>To Closed Lost:</span>
                        <span className="font-medium text-red-600">{analytics.flowSummary.closedLost}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Top Performing Stages */}
                {analytics?.topPerformingStages && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h5 className="font-medium text-green-900 mb-2">Top Performing Stages</h5>
                    <div className="space-y-1 text-sm">
                      {analytics.topPerformingStages.map((stage: any, index: number) => (
                        <div key={index} className="flex justify-between">
                          <span>{stage.stage}</span>
                          <span className="font-medium">{(stage.conversionRate * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <GitBranch className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No stage flow data available</p>
              <p className="text-sm">No deal movements detected in the selected timeframe</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}