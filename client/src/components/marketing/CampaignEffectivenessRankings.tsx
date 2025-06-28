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
    uniqueOpportunities: number;
    sharedOpportunities: number;
    influenceRate: number;
    targetAccountCustomers: number;
    totalAttendees: number;
    averageAttendees: number;
    pipelineValue: number;
    closedWonValue: number;
    winRate: number;
    cac: number;
    roi: number;
    pipelineEfficiency: number;
    targetAccountWinRate: number;
    attendeeEfficiency: number;
    campaignInfluenceScore: number;
    closeAcceleration: {
      closedWithin30Days: number;
      averageDaysToClose: number;
      accelerationRate: number;
    };
    stageProgression: {
      advancedStages: number;
      stageAdvancementRate: number;
      averageDaysToAdvance: number;
    };
    touchPointEffectiveness: {
      averageTouchPoints: number;
      touchPointCloseRate: number;
      singleTouchCloseRate: number;
      multiTouchCloseRate: number;
    };
  };
}

const CampaignEffectivenessRankings: React.FC = () => {
  const { data: campaignData, isLoading, error } = useQuery<CampaignComparisonData[]>({
    queryKey: ['/api/marketing/comparative/campaign-comparison'],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Effectiveness Rankings</CardTitle>
            <CardDescription>Loading campaign performance data...</CardDescription>
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
          <CardTitle className="text-red-600">Error Loading Campaign Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Unable to load campaign effectiveness data. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort campaigns by ROI (highest first)
  const sortedByROI = [...(campaignData || [])].sort((a, b) => 
    (b.metrics?.roi || 0) - (a.metrics?.roi || 0)
  );

  // Sort campaigns by pipeline value (highest first)
  const sortedByPipeline = [...(campaignData || [])].sort((a, b) => 
    (b.metrics?.pipelineValue || 0) - (a.metrics?.pipelineValue || 0)
  );

  // Sort campaigns by win rate (highest first)
  const sortedByWinRate = [...(campaignData || [])].sort((a, b) => 
    (b.metrics?.winRate || 0) - (a.metrics?.winRate || 0)
  );

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const getPerformanceLevel = (roi: number) => {
    if (roi >= 100000) return { level: 'Exceptional', color: 'bg-green-100 text-green-800' };
    if (roi >= 50000) return { level: 'High', color: 'bg-blue-100 text-blue-800' };
    if (roi >= 10000) return { level: 'Good', color: 'bg-yellow-100 text-yellow-800' };
    return { level: 'Developing', color: 'bg-gray-100 text-gray-800' };
  };

  const topROI = sortedByROI.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
                <p className="text-2xl font-bold">{campaignData?.length || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pipeline</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(campaignData?.reduce((sum, c) => sum + (c.metrics?.pipelineValue || 0), 0) || 0)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Closed Won</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(campaignData?.reduce((sum, c) => sum + (c.metrics?.closedWonValue || 0), 0) || 0)}
                </p>
              </div>
              <Trophy className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Win Rate</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatPercentage((campaignData?.reduce((sum, c) => sum + (c.metrics?.winRate || 0), 0) || 0) / Math.max(campaignData?.length || 1, 1))}
                </p>
              </div>
              <Target className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Campaigns by ROI */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Most Effective Campaigns by ROI
          </CardTitle>
          <CardDescription>
            Top 5 campaigns ranked by return on investment and overall effectiveness
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topROI.map((campaign, index) => {
              const performance = getPerformanceLevel(campaign.metrics?.roi || 0);
              
              return (
                <div key={campaign.campaignId} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold">{campaign.campaignName}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{campaign.campaignType}</Badge>
                          <Badge className={performance.color}>{performance.level}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        {formatPercentage(campaign.metrics?.roi || 0)}
                      </p>
                      <p className="text-sm text-gray-600">ROI</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Pipeline Value</p>
                      <p className="font-semibold">
                        {formatCurrency(campaign.metrics?.pipelineValue || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Closed Won</p>
                      <p className="font-semibold">
                        {formatCurrency(campaign.metrics?.closedWonValue || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Win Rate</p>
                      <p className="font-semibold">{formatPercentage(campaign.metrics?.winRate || 0)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Pipeline Efficiency</p>
                      <p className="font-semibold">
                        {formatCurrency(campaign.metrics?.pipelineEfficiency || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* All Campaigns Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Campaign Effectiveness Rankings</CardTitle>
          <CardDescription>
            All {campaignData?.length || 0} campaigns ranked by key performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">ROI</TableHead>
                <TableHead className="text-right">Pipeline Value</TableHead>
                <TableHead className="text-right">Closed Won</TableHead>
                <TableHead className="text-right">Win Rate</TableHead>
                <TableHead className="text-right">Customers</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedByROI.map((campaign, index) => {
                const performance = getPerformanceLevel(campaign.metrics?.roi || 0);
                return (
                  <TableRow key={campaign.campaignId}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{campaign.campaignName}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs text-gray-500">#{index + 1}</span>
                          <Badge className={performance.color}>{performance.level}</Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{campaign.campaignType}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold text-green-600">
                        {formatPercentage(campaign.metrics?.roi || 0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(campaign.metrics?.pipelineValue || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(campaign.metrics?.closedWonValue || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPercentage(campaign.metrics?.winRate || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        <p>{campaign.metrics?.totalCustomers || 0}</p>
                        <p className="text-xs text-gray-500">
                          {campaign.metrics?.targetAccountCustomers || 0} target
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(campaign.cost || 0)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Additional Performance Views */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Pipeline Creators */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Top Pipeline Creators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedByPipeline.slice(0, 5).map((campaign, index) => (
                <div key={campaign.campaignId} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{campaign.campaignName}</p>
                    <p className="text-sm text-gray-600">{campaign.campaignType}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      {formatCurrency(campaign.metrics?.pipelineValue || 0)}
                    </p>
                    <p className="text-xs text-gray-500">#{index + 1}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Highest Win Rates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Highest Win Rates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedByWinRate.slice(0, 5).map((campaign, index) => (
                <div key={campaign.campaignId} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{campaign.campaignName}</p>
                    <p className="text-sm text-gray-600">{campaign.campaignType}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">
                      {formatPercentage(campaign.metrics?.winRate || 0)}
                    </p>
                    <p className="text-xs text-gray-500">#{index + 1}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CampaignEffectivenessRankings;