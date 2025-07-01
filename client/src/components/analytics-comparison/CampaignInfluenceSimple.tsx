import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Users, Target, TrendingUp } from 'lucide-react';

interface CampaignInfluenceData {
  campaignId: number;
  campaignName: string;
  campaignType: string;
  totalCustomers: number;
  pipelineValue: number;
  closedWonValue: number;
  winRate: number;
  cost: number;
  roi: number;
}

const CampaignInfluenceSimple: React.FC = () => {
  const { data, isLoading, error } = useQuery<CampaignInfluenceData[]>({
    queryKey: ['/api/marketing/comparative/campaign-comparison'],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error loading campaign influence data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No campaign influence data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalCampaigns = data.length;
  const totalPipeline = data.reduce((sum, c) => sum + c.pipelineValue, 0);
  const totalCost = data.reduce((sum, c) => sum + c.cost, 0);
  const avgROI = data.reduce((sum, c) => sum + c.roi, 0) / totalCampaigns;

  const topCampaigns = data
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Campaign Influence Analysis</h2>
          <p className="text-muted-foreground">
            Individual campaign performance insights and pipeline influence metrics
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{totalCampaigns}</div>
                <div className="text-sm text-muted-foreground">Total Campaigns</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">${(totalPipeline / 1000000).toFixed(1)}M</div>
                <div className="text-sm text-muted-foreground">Total Pipeline</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">${(totalCost / 1000).toFixed(0)}K</div>
                <div className="text-sm text-muted-foreground">Total Cost</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{avgROI.toFixed(0)}%</div>
                <div className="text-sm text-muted-foreground">Average ROI</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Campaigns</CardTitle>
          <CardDescription>
            Campaigns ranked by ROI performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topCampaigns.map((campaign, index) => (
              <div key={campaign.campaignId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{campaign.campaignName}</div>
                    <div className="text-sm text-muted-foreground">{campaign.campaignType}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{campaign.roi.toFixed(0)}% ROI</div>
                  <div className="text-sm text-muted-foreground">${(campaign.pipelineValue / 1000).toFixed(0)}K pipeline</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Campaign Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance Details</CardTitle>
          <CardDescription>
            Comprehensive performance metrics for all campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Campaign</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Customers</th>
                  <th className="text-left p-2">Pipeline</th>
                  <th className="text-left p-2">Closed Won</th>
                  <th className="text-left p-2">Win Rate</th>
                  <th className="text-left p-2">Cost</th>
                  <th className="text-left p-2">ROI</th>
                </tr>
              </thead>
              <tbody>
                {data.map((campaign) => (
                  <tr key={campaign.campaignId} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{campaign.campaignName}</td>
                    <td className="p-2">{campaign.campaignType}</td>
                    <td className="p-2">{campaign.totalCustomers}</td>
                    <td className="p-2">${(campaign.pipelineValue / 1000).toFixed(0)}K</td>
                    <td className="p-2">${(campaign.closedWonValue / 1000).toFixed(0)}K</td>
                    <td className="p-2">{campaign.winRate.toFixed(1)}%</td>
                    <td className="p-2">${(campaign.cost / 1000).toFixed(0)}K</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        campaign.roi >= 500 ? 'bg-green-100 text-green-800' :
                        campaign.roi >= 200 ? 'bg-blue-100 text-blue-800' :
                        campaign.roi >= 100 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {campaign.roi.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CampaignInfluenceSimple;