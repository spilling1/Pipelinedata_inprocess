import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, DollarSign, Target, AlertTriangle, Lightbulb, Trophy } from 'lucide-react';

interface CampaignTypeData {
  campaignType: string;
  totalCampaigns: number;
  totalCost: number;
  totalCustomers: number;
  totalPipelineValue: number;
  totalClosedWonValue: number;
  totalOpenOpportunities: number;
  averageWinRate: number;
  averageROI: number;
  costEfficiency: number;
  attendeeEfficiency: number;
}

interface CampaignTypeInsightsProps {
  data: CampaignTypeData[];
}

const CampaignTypeInsights: React.FC<CampaignTypeInsightsProps> = ({ data }) => {
  const insights = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Sort by ROI for analysis
    const sortedByROI = [...data].sort((a, b) => b.averageROI - a.averageROI);
    const sortedByCostEfficiency = [...data].sort((a, b) => b.costEfficiency - a.costEfficiency);
    
    const totalCost = data.reduce((sum, item) => sum + item.totalCost, 0);
    const totalPipeline = data.reduce((sum, item) => sum + item.totalPipelineValue, 0);
    const totalClosedWon = data.reduce((sum, item) => sum + item.totalClosedWonValue, 0);
    
    const bestPerformer = sortedByROI[0];
    const worstPerformer = sortedByROI[sortedByROI.length - 1];
    const mostEfficient = sortedByCostEfficiency[0];
    
    // Find types with high cost but low performance (>10% of budget, ROI < average)
    const averageROI = data.reduce((sum, item) => sum + item.averageROI, 0) / data.length;
    const inefficientTypes = data.filter(item => 
      (item.totalCost / totalCost) > 0.1 && item.averageROI < averageROI
    );
    
    // Calculate potential reallocation
    const reallocationOpportunity = inefficientTypes.reduce((sum, item) => sum + item.totalCost, 0);
    const potentialGain = reallocationOpportunity * (bestPerformer.averageROI / 100);
    
    // Performance categories
    const excellentTypes = data.filter(item => item.averageROI >= 500);
    const goodTypes = data.filter(item => item.averageROI >= 200 && item.averageROI < 500);
    const moderateTypes = data.filter(item => item.averageROI >= 100 && item.averageROI < 200);
    const poorTypes = data.filter(item => item.averageROI < 100);
    
    return {
      bestPerformer,
      worstPerformer,
      mostEfficient,
      inefficientTypes,
      reallocationOpportunity,
      potentialGain,
      totalCost,
      totalPipeline,
      totalClosedWon,
      averageROI,
      excellentTypes,
      goodTypes,
      moderateTypes,
      poorTypes
    };
  }, [data]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  if (!insights) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No data available for insights
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Performance Overview
          </CardTitle>
          <CardDescription>
            Campaign type performance distribution and key metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{insights.excellentTypes.length}</div>
              <div className="text-sm text-muted-foreground">Excellent Types (≥500% ROI)</div>
              {insights.excellentTypes.length > 0 && (
                <div className="mt-2 text-xs">
                  {insights.excellentTypes.map(type => type.campaignType).join(', ')}
                </div>
              )}
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{insights.goodTypes.length}</div>
              <div className="text-sm text-muted-foreground">Good Types (200-499% ROI)</div>
              {insights.goodTypes.length > 0 && (
                <div className="mt-2 text-xs">
                  {insights.goodTypes.map(type => type.campaignType).join(', ')}
                </div>
              )}
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">{insights.poorTypes.length}</div>
              <div className="text-sm text-muted-foreground">Poor Types (&lt;100% ROI)</div>
              {insights.poorTypes.length > 0 && (
                <div className="mt-2 text-xs">
                  {insights.poorTypes.map(type => type.campaignType).join(', ')}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Performers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Best ROI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="font-semibold">{insights.bestPerformer.campaignType}</div>
              <div className="text-2xl font-bold text-green-600">
                {formatPercentage(insights.bestPerformer.averageROI)}
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Cost: {formatCurrency(insights.bestPerformer.totalCost)}</div>
                <div>Closed Won: {formatCurrency(insights.bestPerformer.totalClosedWonValue)}</div>
                <div>Win Rate: {formatPercentage(insights.bestPerformer.averageWinRate)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              Most Efficient
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="font-semibold">{insights.mostEfficient.campaignType}</div>
              <div className="text-2xl font-bold text-blue-600">
                {insights.mostEfficient.costEfficiency.toFixed(1)}x
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Pipeline: {formatCurrency(insights.mostEfficient.totalPipelineValue)}</div>
                <div>Cost: {formatCurrency(insights.mostEfficient.totalCost)}</div>
                <div>ROI: {formatPercentage(insights.mostEfficient.averageROI)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="font-semibold">{insights.worstPerformer.campaignType}</div>
              <div className="text-2xl font-bold text-red-600">
                {formatPercentage(insights.worstPerformer.averageROI)}
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Cost: {formatCurrency(insights.worstPerformer.totalCost)}</div>
                <div>Closed Won: {formatCurrency(insights.worstPerformer.totalClosedWonValue)}</div>
                <div>Win Rate: {formatPercentage(insights.worstPerformer.averageWinRate)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reallocation Recommendations */}
      {insights.inefficientTypes.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-semibold">Budget Reallocation Opportunity</div>
              <div>
                Consider reallocating {formatCurrency(insights.reallocationOpportunity)} ({((insights.reallocationOpportunity / insights.totalCost) * 100).toFixed(1)}% of total budget) 
                from underperforming types to {insights.bestPerformer.campaignType}.
              </div>
              <div className="text-sm">
                <strong>Underperforming types:</strong> {insights.inefficientTypes.map(type => type.campaignType).join(', ')}
              </div>
              <div className="text-sm">
                <strong>Potential additional return:</strong> {formatCurrency(insights.potentialGain)} 
                (based on {insights.bestPerformer.campaignType}'s {formatPercentage(insights.bestPerformer.averageROI)} ROI)
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Strategic Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Strategic Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="font-semibold mb-2">Cost Efficiency Analysis</div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>• {insights.mostEfficient.campaignType} generates {insights.mostEfficient.costEfficiency.toFixed(1)}x pipeline per dollar</div>
                  <div>• Average efficiency across all types: {(insights.totalPipeline / insights.totalCost).toFixed(1)}x</div>
                  <div>• Total pipeline generated: {formatCurrency(insights.totalPipeline)}</div>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="font-semibold mb-2">Performance Distribution</div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>• Average ROI: {formatPercentage(insights.averageROI)}</div>
                  <div>• Performance spread: {formatPercentage(insights.bestPerformer.averageROI - insights.worstPerformer.averageROI)}</div>
                  <div>• Total investment: {formatCurrency(insights.totalCost)}</div>
                </div>
              </div>
            </div>

            {/* Action Items */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="font-semibold mb-2">Recommended Actions</div>
              <div className="space-y-2 text-sm">
                {insights.excellentTypes.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Badge variant="default" className="bg-green-100 text-green-800 mt-0.5">Expand</Badge>
                    <div>Increase investment in {insights.excellentTypes.map(t => t.campaignType).join(', ')} - consistently high ROI</div>
                  </div>
                )}
                
                {insights.inefficientTypes.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Badge variant="destructive" className="mt-0.5">Optimize</Badge>
                    <div>Review and optimize {insights.inefficientTypes.map(t => t.campaignType).join(', ')} - high cost, low return</div>
                  </div>
                )}
                
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="mt-0.5">Monitor</Badge>
                  <div>Track win rate improvements for {insights.worstPerformer.campaignType} - focus on conversion optimization</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CampaignTypeInsights;