import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Route } from 'lucide-react';
import type { CustomerJourneyData, CustomerJourneyInsights } from '../hooks/useCustomerJourneyData';

interface JourneyFunnelProps {
  data: CustomerJourneyData[];
  insights: CustomerJourneyInsights | null;
}

const JourneyFunnel: React.FC<JourneyFunnelProps> = ({ data, insights }) => {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  // Create funnel stages based on customer journey data
  const funnelStages = [
    {
      stage: 'First Touch',
      customers: data.length,
      value: data.reduce((sum, c) => sum + c.pipelineValue + c.closedWonValue, 0),
      color: 'bg-blue-500'
    },
    {
      stage: 'Multiple Touches',
      customers: data.filter(c => c.touches > 1).length,
      value: data.filter(c => c.touches > 1).reduce((sum, c) => sum + c.pipelineValue + c.closedWonValue, 0),
      color: 'bg-green-500'
    },
    {
      stage: 'Active Pipeline',
      customers: data.filter(c => c.pipelineValue > 0).length,
      value: data.filter(c => c.pipelineValue > 0).reduce((sum, c) => sum + c.pipelineValue, 0),
      color: 'bg-purple-500'
    },
    {
      stage: 'Closed Won',
      customers: data.filter(c => c.closedWonValue > 0).length,
      value: data.filter(c => c.closedWonValue > 0).reduce((sum, c) => sum + c.closedWonValue, 0),
      color: 'bg-green-600'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Route className="h-5 w-5 text-purple-600" />
          Customer Journey Funnel
        </CardTitle>
        <CardDescription>
          Journey progression from first touch to conversion
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Funnel Visualization */}
        <div className="space-y-3">
          {funnelStages.map((stage, index) => {
            const width = Math.max(20, (stage.customers / funnelStages[0].customers) * 100);
            const conversionRate = index > 0 
              ? (stage.customers / funnelStages[index - 1].customers) * 100 
              : 100;

            return (
              <div key={stage.stage} className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">{stage.stage}</h4>
                  <div className="flex gap-2">
                    <Badge variant="outline">
                      {stage.customers} customers
                    </Badge>
                    {index > 0 && (
                      <Badge className="bg-blue-100 text-blue-800">
                        {conversionRate.toFixed(1)}% conversion
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-lg h-12 flex items-center">
                    <div 
                      className={`${stage.color} h-full rounded-lg flex items-center justify-between px-4 text-white font-medium transition-all duration-500`}
                      style={{ width: `${width}%` }}
                    >
                      <span className="text-sm">{stage.customers}</span>
                      <span className="text-sm">{formatCurrency(stage.value)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Journey Insights */}
        {insights && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-3">
              <h4 className="font-medium">Top Journey Patterns</h4>
              {insights.topJourneyPatterns.slice(0, 3).map((pattern, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium">{pattern.pattern}</span>
                    <Badge variant="outline">{pattern.frequency} customers</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {pattern.conversionRate.toFixed(1)}% conversion • {formatCurrency(pattern.averageValue)} avg value
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Optimization Opportunities</h4>
              
              <div className="p-3 border rounded-lg bg-green-50">
                <div className="font-medium text-green-800 text-sm">Optimal Touch Count</div>
                <div className="text-sm text-green-700">
                  {insights.optimalTouchCount.touches} touches show {insights.optimalTouchCount.conversionRate.toFixed(1)}% conversion rate
                </div>
              </div>

              <div className="p-3 border rounded-lg bg-blue-50">
                <div className="font-medium text-blue-800 text-sm">Multi-Touch Impact</div>
                <div className="text-sm text-blue-700">
                  {insights.multiTouchImpact.description}
                </div>
              </div>

              {insights.journeyBottlenecks.length > 0 && (
                <div className="p-3 border rounded-lg bg-yellow-50">
                  <div className="font-medium text-yellow-800 text-sm">Journey Bottleneck</div>
                  <div className="text-sm text-yellow-700">
                    {insights.journeyBottlenecks[0].stage}: {insights.journeyBottlenecks[0].dropOffRate.toFixed(1)}% drop-off rate
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default JourneyFunnel;