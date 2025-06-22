import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { FilterState } from "@/types/pipeline";
import { useState } from "react";

interface CustomerJourneyChartProps {
  filters: FilterState;
}

export default function CustomerJourneyChart({ filters }: CustomerJourneyChartProps) {
  const [selectedClient, setSelectedClient] = useState<string>('all');
  
  const { data: opportunities, isLoading } = useQuery({
    queryKey: ['/api/opportunities'],
  });

  const { data: analytics } = useQuery({
    queryKey: ['/api/analytics', filters],
  });

  // Get unique clients
  const uniqueClients = opportunities ? 
    Array.from(new Set(opportunities.map((opp: any) => opp.clientName).filter(Boolean))) : [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Customer Journey Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  // Filter opportunities by selected client
  const clientOpportunities = selectedClient === 'all' 
    ? opportunities || []
    : (opportunities || []).filter((opp: any) => opp.clientName === selectedClient);

  // Calculate journey data - value over time for the selected client
  const journeyData = analytics?.pipelineValueByDate || [];
  
  // If a specific client is selected, we would need to fetch their specific journey
  // For now, showing overall trend
  const chartData = journeyData.map((item: any) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
    value: item.value,
    formattedValue: item.value >= 1000000 
      ? `$${(item.value / 1000000).toFixed(1)}M`
      : `$${(item.value / 1000).toFixed(0)}K`
  }));

  const formatTooltipValue = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value.toFixed(0)}`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Customer Journey Analysis</CardTitle>
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              {uniqueClients.map((client: string) => (
                <SelectItem key={client} value={client}>
                  {client}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {clientOpportunities.length}
              </div>
              <div className="text-sm text-blue-600">Opportunities</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatTooltipValue(
                  clientOpportunities.reduce((sum: number, opp: any) => 
                    sum + (opp.latestSnapshot?.amount || 0), 0
                  )
                )}
              </div>
              <div className="text-sm text-green-600">Total Value</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {clientOpportunities.length > 0 
                  ? Math.round(
                      clientOpportunities.reduce((sum: number, opp: any) => 
                        sum + (opp.latestSnapshot?.amount || 0), 0
                      ) / clientOpportunities.length
                    ).toLocaleString()
                  : 0
                }
              </div>
              <div className="text-sm text-purple-600">Avg Deal Size</div>
            </div>
          </div>

          {/* Value Trend Chart */}
          <div className="h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#666"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#666"
                    fontSize={12}
                    tickFormatter={(value) => {
                      if (value >= 1000000) {
                        return `$${(value / 1000000).toFixed(1)}M`;
                      } else if (value >= 1000) {
                        return `$${(value / 1000).toFixed(0)}K`;
                      } else {
                        return `$${value}`;
                      }
                    }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatTooltipValue(value), selectedClient === 'all' ? "Total Value" : `${selectedClient} Value`]}
                    labelStyle={{ color: '#666' }}
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #ccc', 
                      borderRadius: '6px' 
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <p className="text-lg font-medium mb-2">No journey data available</p>
                  <p className="text-sm">Upload pipeline files to track customer journeys</p>
                </div>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          {selectedClient !== 'all' && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-900 mb-2">Recent Opportunities</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {clientOpportunities.slice(0, 5).map((opp: any) => (
                  <div key={opp.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium truncate">{opp.name}</span>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatTooltipValue(opp.latestSnapshot?.amount || 0)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {opp.latestSnapshot?.stage}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}