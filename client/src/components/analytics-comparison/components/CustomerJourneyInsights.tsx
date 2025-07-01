import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, TrendingUp, Target, Users, AlertTriangle } from 'lucide-react';
import type { CustomerJourneyData, CustomerJourneyInsights, CustomerJourneyMetrics } from '../hooks/useCustomerJourneyData';

interface CustomerJourneyInsightsProps {
  data: CustomerJourneyData[];
  insights: CustomerJourneyInsights | null;
  metrics: CustomerJourneyMetrics | null;
}

const CustomerJourneyInsights: React.FC<CustomerJourneyInsightsProps> = ({ data, insights, metrics }) => {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  if (!insights || !metrics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Insufficient data for journey insights analysis
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Journey Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            Customer Journey Insights
          </CardTitle>
          <CardDescription>
            Key findings and optimization opportunities from customer journey analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertDescription>
              <strong>Multi-Touch Impact:</strong> {insights.multiTouchImpact.description}. 
              Multi-touch customers generate {formatCurrency(insights.multiTouchImpact.value)} total value.
            </AlertDescription>
          </Alert>

          <Alert>
            <Target className="h-4 w-4" />
            <AlertDescription>
              <strong>Optimal Touch Strategy:</strong> {insights.optimalTouchCount.reasoning}. 
              Focus on campaigns that encourage {insights.optimalTouchCount.touches} meaningful touchpoints.
            </AlertDescription>
          </Alert>

          {insights.journeyBottlenecks.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Journey Bottleneck:</strong> {insights.journeyBottlenecks[0].stage} stage shows 
                {insights.journeyBottlenecks[0].dropOffRate.toFixed(1)}% drop-off rate. 
                Consider targeted interventions for customers in this stage.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Journey Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Journey Efficiency Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Average Journey Period</span>
              <Badge className="bg-blue-100 text-blue-800">
                {metrics.averageJourneyPeriod.toFixed(0)} days
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Average Journey CAC</span>
              <Badge className="bg-purple-100 text-purple-800">
                {formatCurrency(metrics.averageJourneyCAC)}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Multi-Touch Percentage</span>
              <Badge className="bg-green-100 text-green-800">
                {formatPercentage(metrics.multiTouchPercentage)}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Journey Value</span>
              <Badge className="bg-orange-100 text-orange-800">
                {formatCurrency(metrics.totalJourneyValue)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Touch Point Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(metrics.conversionByTouches)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .slice(0, 4)
              .map(([touches, data]) => (
                <div key={touches} className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {touches} Touch{parseInt(touches) !== 1 ? 'es' : ''}
                  </span>
                  <div className="flex gap-2">
                    <Badge variant="outline">
                      {data.customers} customers
                    </Badge>
                    <Badge className={
                      data.conversionRate >= 30 ? "bg-green-100 text-green-800" :
                      data.conversionRate >= 20 ? "bg-blue-100 text-blue-800" :
                      "bg-yellow-100 text-yellow-800"
                    }>
                      {formatPercentage(data.conversionRate)} conv.
                    </Badge>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      {/* Journey Pattern Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Top Journey Patterns</CardTitle>
          <CardDescription>
            Most common campaign type sequences and their effectiveness
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.topJourneyPatterns.map((pattern, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{pattern.pattern}</div>
                  <div className="text-sm text-muted-foreground">
                    {pattern.frequency} customers • {formatPercentage(pattern.conversionRate)} conversion rate
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">
                    {formatCurrency(pattern.averageValue)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    avg value
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Journey Bottlenecks */}
      {insights.journeyBottlenecks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Journey Bottlenecks</CardTitle>
            <CardDescription>
              Stages with highest drop-off rates requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.journeyBottlenecks.map((bottleneck, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{bottleneck.stage}</div>
                    <div className="text-sm text-muted-foreground">
                      Stage performance analysis
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={bottleneck.dropOffRate > 70 ? "destructive" : "outline"}>
                      {formatPercentage(bottleneck.dropOffRate)} drop-off
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {bottleneck.impact} impact
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strategic Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Strategic Recommendations</CardTitle>
          <CardDescription>
            Actionable insights to optimize customer journey performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg bg-green-50">
              <h4 className="font-medium text-green-800 mb-2">Touch Point Optimization</h4>
              <p className="text-sm text-green-700">
                Focus on achieving {insights.optimalTouchCount.touches} meaningful touches per customer. 
                This appears to be the sweet spot for conversion optimization.
              </p>
            </div>

            <div className="p-4 border rounded-lg bg-blue-50">
              <h4 className="font-medium text-blue-800 mb-2">Multi-Touch Strategy</h4>
              <p className="text-sm text-blue-700">
                Multi-touch customers show significantly higher value. Invest in nurture campaigns 
                to increase customer engagement across multiple touchpoints.
              </p>
            </div>

            <div className="p-4 border rounded-lg bg-purple-50">
              <h4 className="font-medium text-purple-800 mb-2">Journey Acceleration</h4>
              <p className="text-sm text-purple-700">
                Average journey period is {metrics.averageJourneyPeriod.toFixed(0)} days. 
                Consider implementing automated follow-up sequences to accelerate conversions.
              </p>
            </div>

            <div className="p-4 border rounded-lg bg-orange-50">
              <h4 className="font-medium text-orange-800 mb-2">Pattern Replication</h4>
              <p className="text-sm text-orange-700">
                Top-performing journey pattern "{insights.topJourneyPatterns[0]?.pattern}" shows{' '}
                {formatPercentage(insights.topJourneyPatterns[0]?.conversionRate || 0)} conversion. 
                Replicate this sequence for similar customer segments.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerJourneyInsights;