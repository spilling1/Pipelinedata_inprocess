import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, DollarSign, Target, Users, Trophy, Zap, Clock } from 'lucide-react';

interface CampaignComparisonData {
  campaignId: number;
  campaignName: string;
  campaignType: string;
  cost: number;
  startDate: string;
  status: string;
  metrics: {
    totalCustomers: number;
    totalTargetCustomers: number;
    targetAccountPercentage: number;
    totalPipelineValue: number;
    totalClosedWonValue: number;
    totalAttendees: number;
    winRate: number;
    roi: number;
    targetAccountWinRate: number;
    costEfficiency: number;
    attendeeEfficiency: number;
  };
}

const CampaignInfluenceAnalytics: React.FC = () => {
  const { data: campaignData, isLoading, error } = useQuery<CampaignComparisonData[]>({
    queryKey: ['/api/marketing/comparative/campaign-comparison'],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Influence Analytics</CardTitle>
            <CardDescription>Loading campaign performance and influence data...</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Error Loading Campaign Influence Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Unable to load campaign influence analytics. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  // Calculate aggregate insights using available data
  const totalCampaigns = campaignData?.length || 0;
  const avgWinRate = campaignData?.reduce((sum, c) => sum + (c.metrics.winRate || 0), 0) / totalCampaigns || 0;
  const avgROI = campaignData?.reduce((sum, c) => sum + (c.metrics.roi || 0), 0) / totalCampaigns || 0;
  const avgTargetAccountPercentage = campaignData?.reduce((sum, c) => sum + (c.metrics.targetAccountPercentage || 0), 0) / totalCampaigns || 0;

  // Campaign effectiveness insights
  const highROICampaigns = campaignData?.filter(c => (c.metrics.roi || 0) > avgROI) || [];
  const targetAccountFocusedCampaigns = campaignData?.filter(c => (c.metrics.targetAccountPercentage || 0) > 50) || [];
  const highWinRateCampaigns = campaignData?.filter(c => (c.metrics.winRate || 0) > avgWinRate) || [];

  const getBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'event':
        return 'bg-blue-100 text-blue-800';
      case 'roadshow':
        return 'bg-green-100 text-green-800';
      case 'webinar':
        return 'bg-purple-100 text-purple-800';
      case 'conference':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPerformanceLevel = (winRate: number) => {
    if (winRate >= 40) return { level: 'Excellent', color: 'text-green-600' };
    if (winRate >= 25) return { level: 'Good', color: 'text-blue-600' };
    if (winRate >= 15) return { level: 'Average', color: 'text-yellow-600' };
    return { level: 'Needs Improvement', color: 'text-red-600' };
  };

  return (
    <div className="space-y-6">
      {/* Summary Insights */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Win Rate</p>
                <p className="text-2xl font-bold text-blue-600">{formatPercentage(avgWinRate)}</p>
                <p className="text-xs text-gray-500">Across all campaigns</p>
              </div>
              <Trophy className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg ROI</p>
                <p className="text-2xl font-bold text-green-600">{formatPercentage(avgROI)}</p>
                <p className="text-xs text-gray-500">Return on investment</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Target Account Focus</p>
                <p className="text-2xl font-bold text-purple-600">{formatPercentage(avgTargetAccountPercentage)}</p>
                <p className="text-xs text-gray-500">Strategic targeting</p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Performers</p>
                <p className="text-2xl font-bold text-orange-600">{highWinRateCampaigns.length}</p>
                <p className="text-xs text-gray-500">Above average campaigns</p>
              </div>
              <Zap className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Performance Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Campaign Performance Analysis
          </CardTitle>
          <CardDescription>
            Individual campaign effectiveness and strategic impact analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {campaignData?.map((campaign, index) => {
              const performance = getPerformanceLevel(campaign.metrics.winRate);
              const isHighROI = (campaign.metrics.roi || 0) > avgROI;
              const isTargetFocused = (campaign.metrics.targetAccountPercentage || 0) > 50;
              
              return (
                <div key={index} className="border rounded-lg p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{campaign.campaignName}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getBadgeColor(campaign.campaignType)}>
                          {campaign.campaignType}
                        </Badge>
                        <span className={`text-sm font-medium ${performance.color}`}>
                          {performance.level}
                        </span>
                        {isTargetFocused && (
                          <Badge className="bg-purple-100 text-purple-800">
                            Target Focused
                          </Badge>
                        )}
                        {isHighROI && (
                          <Badge className="bg-green-100 text-green-800">
                            High ROI
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Cost</p>
                      <p className="text-lg font-bold">{formatCurrency(campaign.cost)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Customers</p>
                      <p className="text-xl font-semibold">{campaign.metrics.totalCustomers}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Pipeline Value</p>
                      <p className="text-xl font-semibold">{formatCurrency(campaign.metrics.totalPipelineValue)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Win Rate</p>
                      <p className="text-xl font-semibold">{formatPercentage(campaign.metrics.winRate)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">ROI</p>
                      <p className="text-xl font-semibold">{formatPercentage(campaign.metrics.roi)}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Target Account Coverage</span>
                        <span className="text-sm font-bold">
                          {formatPercentage(campaign.metrics.targetAccountPercentage)}
                        </span>
                      </div>
                      <Progress value={campaign.metrics.targetAccountPercentage} className="h-2" />
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Cost Efficiency</span>
                        <span className="text-sm font-bold">
                          {formatCurrency(campaign.metrics.costEfficiency)}
                        </span>
                      </div>
                      <Progress value={Math.min((campaign.metrics.costEfficiency / 10000) * 100, 100)} className="h-2" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Strategic Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Strategic Campaign Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 text-blue-800">Performance Analysis</h4>
              <ul className="text-sm space-y-1 text-blue-700">
                <li>• {totalCampaigns} campaigns analyzed with {formatPercentage(avgWinRate)} average win rate</li>
                <li>• {highWinRateCampaigns.length} campaigns performing above average win rate</li>
                <li>• {targetAccountFocusedCampaigns.length} campaigns focused on target accounts (&gt;50% coverage)</li>
                <li>• {highROICampaigns.length} campaigns showing above-average ROI performance</li>
              </ul>
            </div>
            
            {targetAccountFocusedCampaigns.length > totalCampaigns / 2 && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-green-800">Target Account Strategy Success</h4>
                <p className="text-sm text-green-700">
                  {formatPercentage((targetAccountFocusedCampaigns.length / totalCampaigns) * 100)} of campaigns 
                  show strong target account focus. This strategic approach appears to be driving pipeline success.
                </p>
              </div>
            )}

            {highROICampaigns.length > totalCampaigns / 3 && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-yellow-800">ROI Optimization Opportunity</h4>
                <p className="text-sm text-yellow-700">
                  {formatPercentage((highROICampaigns.length / totalCampaigns) * 100)} of campaigns show 
                  strong ROI. Consider analyzing top performers to replicate successful strategies.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CampaignInfluenceAnalytics;