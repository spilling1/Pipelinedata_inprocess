import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Target, TrendingUp, Users, DollarSign } from 'lucide-react';
import type { TargetAccountAnalytics } from '../hooks/useTargetAccountData';

interface TargetAccountInsightsProps {
  data: TargetAccountAnalytics & { insights?: any };
  recommendations: Array<{
    type: string;
    title: string;
    description: string;
    impact: string;
    metric: string;
  }>;
}

const TargetAccountInsights: React.FC<TargetAccountInsightsProps> = ({ data, recommendations }) => {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800">High Impact</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium Impact</Badge>;
      case 'low':
        return <Badge className="bg-green-100 text-green-800">Low Impact</Badge>;
      default:
        return <Badge variant="outline">Impact</Badge>;
    }
  };

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'deal_size':
        return <DollarSign className="h-4 w-4" />;
      case 'win_rate':
        return <Target className="h-4 w-4" />;
      case 'efficiency':
        return <Users className="h-4 w-4" />;
      case 'roi':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  // Calculate key insights
  const insights = {
    dealSizeAdvantage: data.comparison.targetAccountAdvantage.dealSizeMultiplier,
    winRateAdvantage: data.comparison.targetAccountAdvantage.winRateAdvantage,
    attendeeEfficiency: data.comparison.targetAccountAdvantage.attendeeEfficiency,
    roiDifference: data.targetAccounts.roi - data.nonTargetAccounts.roi,
    totalTargetValue: data.targetAccounts.totalPipelineValue + data.targetAccounts.closedWonValue,
    totalNonTargetValue: data.nonTargetAccounts.totalPipelineValue + data.nonTargetAccounts.closedWonValue
  };

  return (
    <div className="space-y-6">
      {/* Strategic Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            Target Account Strategy Insights
          </CardTitle>
          <CardDescription>
            Key findings and strategic recommendations based on target vs non-target performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Target className="h-4 w-4" />
            <AlertDescription>
              <strong>Target Account Advantage:</strong> Target accounts generate{' '}
              {insights.dealSizeAdvantage.toFixed(1)}x larger deals with{' '}
              {insights.winRateAdvantage.toFixed(1)}% higher win rates, representing{' '}
              {formatCurrency(insights.totalTargetValue)} total value vs{' '}
              {formatCurrency(insights.totalNonTargetValue)} from non-targets.
            </AlertDescription>
          </Alert>

          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertDescription>
              <strong>ROI Performance:</strong> Target accounts deliver{' '}
              {formatPercentage(data.targetAccounts.roi)} ROI compared to{' '}
              {formatPercentage(data.nonTargetAccounts.roi)} for non-targets, representing a{' '}
              {insights.roiDifference.toFixed(1)} percentage point advantage.
            </AlertDescription>
          </Alert>

          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              <strong>Resource Efficiency:</strong> Target accounts show{' '}
              {insights.attendeeEfficiency.toFixed(1)}x better attendee efficiency, suggesting{' '}
              optimal resource allocation toward target account campaigns yields superior results.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Strategic Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Strategic Recommendations</CardTitle>
          <CardDescription>
            Actionable insights to optimize target account marketing strategy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {recommendations.length > 0 ? (
            recommendations.map((rec, index) => (
              <div key={index} className="flex gap-4 p-4 border rounded-lg">
                <div className="flex-shrink-0 mt-1">
                  {getMetricIcon(rec.metric)}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium">{rec.title}</h4>
                    {getImpactBadge(rec.impact)}
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No specific recommendations available. Current target account strategy appears optimal.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Comparison Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Key Performance Ratios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Deal Size Multiplier</span>
              <Badge className="bg-green-100 text-green-800">
                {insights.dealSizeAdvantage.toFixed(1)}x
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Win Rate Advantage</span>
              <Badge className="bg-blue-100 text-blue-800">
                +{insights.winRateAdvantage.toFixed(1)}%
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Attendee Efficiency</span>
              <Badge className="bg-purple-100 text-purple-800">
                {insights.attendeeEfficiency.toFixed(1)}x
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">ROI Difference</span>
              <Badge className="bg-orange-100 text-orange-800">
                +{insights.roiDifference.toFixed(1)}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Strategy Optimization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Recommended Focus</h4>
              <p className="text-sm text-muted-foreground">
                {insights.dealSizeAdvantage >= 2.0 
                  ? "Prioritize target account campaigns for maximum deal value"
                  : insights.dealSizeAdvantage >= 1.5 
                  ? "Balance target and non-target campaigns with slight target preference"
                  : "Continue current strategy with data-driven adjustments"
                }
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Resource Allocation</h4>
              <p className="text-sm text-muted-foreground">
                {insights.attendeeEfficiency >= 1.5 
                  ? "Allocate premium attendees to target account events"
                  : "Maintain current attendee distribution strategy"
                }
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Expected Impact</h4>
              <p className="text-sm text-muted-foreground">
                Implementing target-focused strategy could increase overall ROI by{' '}
                {Math.min(insights.roiDifference * 0.5, 25).toFixed(0)}% based on current performance gaps.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TargetAccountInsights;