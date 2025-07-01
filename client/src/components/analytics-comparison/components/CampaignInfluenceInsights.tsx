import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, Target, DollarSign, Users, Lightbulb, BarChart3 } from 'lucide-react';
import type { CampaignInfluenceData, CampaignInfluenceMetrics } from '../hooks/useCampaignInfluenceData';

interface CampaignInfluenceInsightsProps {
  campaigns: CampaignInfluenceData[];
  metrics: CampaignInfluenceMetrics | null;
}

const CampaignInfluenceInsights: React.FC<CampaignInfluenceInsightsProps> = ({ campaigns, metrics }) => {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  // Analyze campaign traits
  const analyzeTraits = () => {
    if (!campaigns || campaigns.length === 0) return null;

    const topCampaigns = campaigns.slice(0, 5);
    
    // Campaign type distribution in top performers
    const typeDistribution = topCampaigns.reduce((acc, campaign) => {
      acc[campaign.campaignType] = (acc[campaign.campaignType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dominantType = Object.entries(typeDistribution).reduce((a, b) => 
      typeDistribution[a[0]] > typeDistribution[b[0]] ? a : b
    )[0];

    // Cost analysis
    const lowCostThreshold = 20000;
    const lowCostCampaigns = topCampaigns.filter(c => c.cost < lowCostThreshold);
    const lowCostPercentage = (lowCostCampaigns.length / topCampaigns.length) * 100;

    // Target account focus
    const targetFocusedCampaigns = topCampaigns.filter(c => 
      c.metrics.targetAccountCustomers / c.metrics.totalCustomers > 0.5
    );
    const targetFocusPercentage = (targetFocusedCampaigns.length / topCampaigns.length) * 100;

    return {
      dominantType,
      dominantTypeCount: typeDistribution[dominantType],
      lowCostPercentage,
      targetFocusPercentage,
      typeDistribution
    };
  };

  // Performance distribution analysis
  const analyzePerformance = () => {
    if (!campaigns || campaigns.length === 0) return null;

    const excellent = campaigns.filter(c => c.metrics.roi >= 500);
    const good = campaigns.filter(c => c.metrics.roi >= 200 && c.metrics.roi < 500);
    const moderate = campaigns.filter(c => c.metrics.roi >= 100 && c.metrics.roi < 200);
    const poor = campaigns.filter(c => c.metrics.roi < 100);

    return {
      excellent: excellent.length,
      good: good.length,
      moderate: moderate.length,
      poor: poor.length,
      total: campaigns.length
    };
  };

  // Efficiency insights
  const analyzeEfficiency = () => {
    if (!campaigns || campaigns.length === 0) return null;

    const sortedByEfficiency = [...campaigns].sort((a, b) => 
      b.metrics.pipelineEfficiency - a.metrics.pipelineEfficiency
    );

    const topEfficient = sortedByEfficiency.slice(0, 3);
    const averageEfficiency = campaigns.reduce((sum, c) => 
      sum + c.metrics.pipelineEfficiency, 0
    ) / campaigns.length;

    return {
      topEfficient,
      averageEfficiency,
      bestEfficiency: topEfficient[0]?.metrics.pipelineEfficiency || 0
    };
  };

  const traits = analyzeTraits();
  const performance = analyzePerformance();
  const efficiency = analyzeEfficiency();

  if (!metrics || !traits || !performance || !efficiency) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Insufficient data for insights analysis
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            Strategic Insights
          </CardTitle>
          <CardDescription>
            Key patterns and recommendations from campaign performance analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertDescription>
              <strong>Top Campaign Traits:</strong> Top campaigns were mostly {traits.dominantType}s 
              ({traits.dominantTypeCount}/{campaigns.slice(0, 5).length}) with{' '}
              {traits.lowCostPercentage >= 60 ? 'low cost (<$20K)' : 'varied cost structures'} and{' '}
              {traits.targetFocusPercentage >= 60 ? 'strong target account focus' : 'mixed account targeting'}.
            </AlertDescription>
          </Alert>

          {metrics.bestCampaign && (
            <Alert>
              <Target className="h-4 w-4" />
              <AlertDescription>
                <strong>Best Performer:</strong> "{metrics.bestCampaign.campaignName}" 
                ({metrics.bestCampaign.campaignType}) delivered {formatPercentage(metrics.bestCampaign.metrics.roi)} ROI 
                with {formatCurrency(metrics.bestCampaign.metrics.pipelineValue)} pipeline from {metrics.bestCampaign.metrics.totalCustomers} customers.
              </AlertDescription>
            </Alert>
          )}

          {efficiency.bestEfficiency > efficiency.averageEfficiency * 1.5 && (
            <Alert>
              <BarChart3 className="h-4 w-4" />
              <AlertDescription>
                <strong>Efficiency Opportunity:</strong> Top efficient campaigns generate 
                {efficiency.bestEfficiency.toFixed(1)}x pipeline per dollar vs {efficiency.averageEfficiency.toFixed(1)}x average. 
                Focus on replicating high-efficiency campaign structures.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Performance Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance Distribution</CardTitle>
            <CardDescription>Campaign ROI performance breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">Excellent (≥500%)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-500">
                  {performance.excellent}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {((performance.excellent / performance.total) * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm">Good (200-499%)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-blue-500 text-white">
                  {performance.good}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {((performance.good / performance.total) * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm">Moderate (100-199%)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                  {performance.moderate}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {((performance.moderate / performance.total) * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm">Poor (&lt;100%)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="destructive">
                  {performance.poor}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {((performance.poor / performance.total) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Campaign Type Success</CardTitle>
            <CardDescription>Performance by campaign type in top 5</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(traits.typeDistribution)
              .sort(([,a], [,b]) => b - a)
              .map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{type}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {count}/{campaigns.slice(0, 5).length}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {((count / campaigns.slice(0, 5).length) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      {/* Top Efficient Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pipeline Efficiency Leaders</CardTitle>
          <CardDescription>
            Campaigns with highest pipeline value per dollar invested
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {efficiency.topEfficient.slice(0, 3).map((campaign, index) => (
              <div key={campaign.campaignId} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{campaign.campaignName}</div>
                  <div className="text-sm text-muted-foreground">
                    {campaign.campaignType} • {formatCurrency(campaign.cost)} invested
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-purple-600">
                    {campaign.metrics.pipelineEfficiency.toFixed(1)}x
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(campaign.metrics.pipelineValue)} pipeline
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CampaignInfluenceInsights;