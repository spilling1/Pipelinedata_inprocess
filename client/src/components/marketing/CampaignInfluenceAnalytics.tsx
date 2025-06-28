import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, DollarSign, Target, Users, Trophy, Zap } from 'lucide-react';

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
  const { data: campaignData, isLoading, error } = useQuery<CampaignInfluenceMetrics[]>({
    queryKey: ['/api/marketing/comparative/campaign-comparison'],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Influence Analytics</CardTitle>
            <CardDescription>Loading behavioral influence tracking data...</CardDescription>
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
  const formatDays = (value: number) => `${value.toFixed(1)} days`;

  // Calculate aggregate insights
  const totalCampaigns = campaignData?.length || 0;
  const avgInfluenceRate = campaignData?.reduce((sum, c) => sum + c.metrics.influenceRate, 0) / totalCampaigns || 0;
  const avgAccelerationRate = campaignData?.reduce((sum, c) => sum + c.metrics.closeAcceleration.accelerationRate, 0) / totalCampaigns || 0;
  const avgStageProgression = campaignData?.reduce((sum, c) => sum + c.metrics.stageProgression.stageAdvancementRate, 0) / totalCampaigns || 0;

  // Multi-touch insights
  const multiTouchCampaigns = campaignData?.filter(c => c.metrics.touchPointEffectiveness.multiTouchCloseRate > c.metrics.touchPointEffectiveness.singleTouchCloseRate) || [];
  const multiTouchAdvantage = multiTouchCampaigns.length / totalCampaigns * 100;

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

  const getInfluenceLevel = (rate: number) => {
    if (rate >= 80) return { level: 'Excellent', color: 'text-green-600' };
    if (rate >= 60) return { level: 'Good', color: 'text-blue-600' };
    if (rate >= 40) return { level: 'Moderate', color: 'text-yellow-600' };
    return { level: 'Low', color: 'text-red-600' };
  };

  return (
    <div className="space-y-6">
      {/* Summary Insights */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Influence Rate</p>
                <p className="text-2xl font-bold text-blue-600">{formatPercentage(avgInfluenceRate)}</p>
                <p className="text-xs text-gray-500">Multi-touch correlation</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Close Acceleration</p>
                <p className="text-2xl font-bold text-green-600">{formatPercentage(avgAccelerationRate)}</p>
                <p className="text-xs text-gray-500">Within 30 days</p>
              </div>
              <Zap className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Stage Progression</p>
                <p className="text-2xl font-bold text-purple-600">{formatPercentage(avgStageProgression)}</p>
                <p className="text-xs text-gray-500">Stage advancement</p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Multi-Touch Advantage</p>
                <p className="text-2xl font-bold text-orange-600">{formatPercentage(multiTouchAdvantage)}</p>
                <p className="text-xs text-gray-500">Campaigns benefit</p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign-by-Campaign Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Campaign Behavioral Influence Analysis
          </CardTitle>
          <CardDescription>
            Close date acceleration, stage progression, and touch point effectiveness within 30-day campaign windows
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {campaignData?.map((campaign, index) => {
              const influence = getInfluenceLevel(campaign.metrics.influenceRate);
              return (
                <div key={index} className="border rounded-lg p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{campaign.campaignName}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getBadgeColor(campaign.campaignType)}>
                          {campaign.campaignType}
                        </Badge>
                        <span className={`text-sm font-medium ${influence.color}`}>
                          {influence.level} Influence
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Influence Score</p>
                      <p className="text-xl font-bold text-blue-600">
                        {campaign.metrics.campaignInfluenceScore.toFixed(1)}
                      </p>
                    </div>
                  </div>

                  {/* Behavioral Metrics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Close Acceleration */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-sm">Close Date Acceleration</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Acceleration Rate</span>
                          <span className="font-semibold">
                            {formatPercentage(campaign.metrics.closeAcceleration.accelerationRate)}
                          </span>
                        </div>
                        <Progress 
                          value={Math.min(campaign.metrics.closeAcceleration.accelerationRate, 100)} 
                          className="h-2"
                        />
                        <div className="text-xs text-gray-500">
                          {campaign.metrics.closeAcceleration.closedWithin30Days} deals closed within 30 days
                        </div>
                        <div className="text-xs text-gray-500">
                          Avg: {formatDays(campaign.metrics.closeAcceleration.averageDaysToClose)}
                        </div>
                      </div>
                    </div>

                    {/* Stage Progression */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-purple-600" />
                        <span className="font-medium text-sm">Stage Progression</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Advancement Rate</span>
                          <span className="font-semibold">
                            {formatPercentage(campaign.metrics.stageProgression.stageAdvancementRate)}
                          </span>
                        </div>
                        <Progress 
                          value={Math.min(campaign.metrics.stageProgression.stageAdvancementRate, 100)} 
                          className="h-2"
                        />
                        <div className="text-xs text-gray-500">
                          {campaign.metrics.stageProgression.advancedStages} opportunities advanced stages
                        </div>
                        <div className="text-xs text-gray-500">
                          Avg: {formatDays(campaign.metrics.stageProgression.averageDaysToAdvance)}
                        </div>
                      </div>
                    </div>

                    {/* Touch Point Effectiveness */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-orange-600" />
                        <span className="font-medium text-sm">Touch Point Effectiveness</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Single-Touch</span>
                          <span className="font-semibold">
                            {formatPercentage(campaign.metrics.touchPointEffectiveness.singleTouchCloseRate)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Multi-Touch</span>
                          <span className="font-semibold">
                            {formatPercentage(campaign.metrics.touchPointEffectiveness.multiTouchCloseRate)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Avg: {campaign.metrics.touchPointEffectiveness.averageTouchPoints.toFixed(1)} touch points
                        </div>
                        <div className="text-xs text-gray-500">
                          Overall: {formatPercentage(campaign.metrics.touchPointEffectiveness.touchPointCloseRate)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Touch Attribution Summary */}
                  <div className="mt-4 pt-4 border-t bg-gray-50 rounded p-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Customers</p>
                        <p className="text-lg font-bold">{campaign.metrics.totalCustomers}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Unique Opportunities</p>
                        <p className="text-lg font-bold text-blue-600">{campaign.metrics.uniqueOpportunities}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Shared Opportunities</p>
                        <p className="text-lg font-bold text-orange-600">{campaign.metrics.sharedOpportunities}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Influence Rate</p>
                        <p className={`text-lg font-bold ${influence.color}`}>
                          {formatPercentage(campaign.metrics.influenceRate)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Key Insights Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Behavioral Influence Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 text-blue-800">Campaign Influence Analysis</h4>
              <ul className="text-sm space-y-1 text-blue-700">
                <li>• Close date acceleration tracking within 30-day campaign windows</li>
                <li>• Stage progression analysis for behavioral change measurement</li>
                <li>• Multi-touch attribution preserving all campaign interactions</li>
                <li>• Touch point effectiveness comparing single vs multi-touch correlations</li>
              </ul>
            </div>
            
            {multiTouchAdvantage > 50 && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-green-800">Multi-Touch Strategy Recommendation</h4>
                <p className="text-sm text-green-700">
                  {formatPercentage(multiTouchAdvantage)} of campaigns show higher close rates with multi-touch 
                  engagement. Consider coordinated campaign strategies for maximum influence.
                </p>
              </div>
            )}

            {avgAccelerationRate > 20 && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-yellow-800">Acceleration Opportunity</h4>
                <p className="text-sm text-yellow-700">
                  Strong acceleration patterns detected ({formatPercentage(avgAccelerationRate)} average). 
                  Focus on campaigns with proven ability to accelerate deal closure.
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