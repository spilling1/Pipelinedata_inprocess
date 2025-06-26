import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AlertTriangle, BarChart3 } from "lucide-react";
import { SalesFilterState } from "@/types/sales";

interface SalesLossReasonByStageProps {
  filters: SalesFilterState;
}

const STAGE_COLORS = [
  '#9E9E9E', // Gray for early stages
  '#FFC107', // Amber for middle stages
  '#FF5722', // Red for late stages
  '#F44336', // Deep red for final stages
];

export default function SalesLossReasonByStage({ filters }: SalesLossReasonByStageProps) {
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
    queryKey: ['/api/sales/loss-analysis', queryParams.toString()],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Loss Reasons by Stage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  const lossDataByStage = analytics?.lossByStage || [];

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value?.toFixed(0) || 0}`;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-red-600">
            Lost Deals: {data.lostCount}
          </p>
          <p className="text-sm text-red-600">
            Lost Value: {formatCurrency(data.lostValue)}
          </p>
          {data.topReason && (
            <p className="text-xs text-gray-600 mt-1">
              Top Reason: {data.topReason}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Prepare chart data
  const chartData = lossDataByStage.map((stage: any, index: number) => ({
    stage: stage.stage,
    lostCount: stage.lostCount,
    lostValue: stage.lostValue,
    topReason: stage.topReason,
    color: STAGE_COLORS[index % STAGE_COLORS.length]
  }));

  const totalLostDeals = lossDataByStage.reduce((sum: number, stage: any) => sum + stage.lostCount, 0);
  const totalLostValue = lossDataByStage.reduce((sum: number, stage: any) => sum + stage.lostValue, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-red-500" />
          Loss Reasons by Stage
          {filters.salesRep !== 'all' && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              - {filters.salesRep}
            </span>
          )}
        </CardTitle>
        <div className="text-sm text-gray-600">
          Total: {totalLostDeals} deals • {formatCurrency(totalLostValue)} lost value
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Chart */}
          {chartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="stage" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="lostCount" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No loss data by stage available</p>
              <p className="text-sm">No closed lost opportunities found</p>
            </div>
          )}

          {/* Stage Details */}
          {lossDataByStage.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-700">Stage Loss Breakdown</h4>
              <div className="grid grid-cols-1 gap-3">
                {lossDataByStage.map((stage: any, index: number) => (
                  <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{stage.stage}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {stage.lostCount} deals
                        </Badge>
                        <Badge className="bg-red-100 text-red-800 text-xs">
                          {formatCurrency(stage.lostValue)}
                        </Badge>
                      </div>
                    </div>
                    
                    {stage.topReason && (
                      <div className="text-xs text-red-700 mb-2">
                        <span className="font-medium">Top Loss Reason:</span> {stage.topReason}
                      </div>
                    )}
                    
                    {stage.reasons && stage.reasons.length > 0 && (
                      <div className="space-y-1">
                        {stage.reasons.slice(0, 3).map((reason: any, reasonIndex: number) => (
                          <div key={reasonIndex} className="flex items-center justify-between text-xs">
                            <span className="text-red-600">{reason.reason}</span>
                            <span className="text-red-700 font-medium">{reason.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary Insights */}
          {analytics?.lossInsights && (
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-orange-900">Loss Analysis Insights</span>
              </div>
              <ul className="text-sm text-orange-800 space-y-1">
                {analytics.lossInsights.map((insight: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="w-1 h-1 bg-orange-600 rounded-full mt-2 flex-shrink-0"></span>
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