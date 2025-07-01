import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, DollarSign, Users, Target, Trophy } from 'lucide-react';
import type { CampaignInfluenceData } from '../hooks/useCampaignInfluenceData';

interface TopCampaignCardsProps {
  campaigns: CampaignInfluenceData[];
}

const TopCampaignCards: React.FC<TopCampaignCardsProps> = ({ campaigns }) => {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const getPerformanceBadge = (roi: number) => {
    if (roi >= 500) return { variant: "default" as const, label: "Excellent", color: "bg-green-100 text-green-800" };
    if (roi >= 200) return { variant: "secondary" as const, label: "Good", color: "bg-blue-100 text-blue-800" };
    if (roi >= 100) return { variant: "outline" as const, label: "Moderate", color: "bg-yellow-100 text-yellow-800" };
    return { variant: "destructive" as const, label: "Poor", color: "bg-red-100 text-red-800" };
  };

  if (!campaigns || campaigns.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No top campaigns to display
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-yellow-600" />
        <h3 className="text-lg font-semibold">Top Performing Campaigns</h3>
        <Badge variant="secondary">{campaigns.length} campaigns</Badge>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {campaigns.map((campaign, index) => {
          const performance = getPerformanceBadge(campaign.metrics.roi);
          
          return (
            <Card key={campaign.campaignId} className="relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base leading-tight">{campaign.campaignName}</CardTitle>
                    <CardDescription className="text-sm">
                      {campaign.campaignType} • {new Date(campaign.startDate).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={performance.color}>{performance.label}</Badge>
                    {index === 0 && (
                      <div className="flex items-center gap-1">
                        <Trophy className="h-3 w-3 text-yellow-600" />
                        <span className="text-xs text-yellow-600 font-medium">#1</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      <span className="text-xs text-muted-foreground">ROI</span>
                    </div>
                    <p className="text-lg font-bold text-green-600">
                      {formatPercentage(campaign.metrics.roi)}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-purple-600" />
                      <span className="text-xs text-muted-foreground">Pipeline</span>
                    </div>
                    <p className="text-lg font-bold">
                      {formatCurrency(campaign.metrics.pipelineValue)}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-blue-600" />
                      <span className="text-xs text-muted-foreground">Customers</span>
                    </div>
                    <p className="text-lg font-bold">
                      {campaign.metrics.totalCustomers}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3 text-orange-600" />
                      <span className="text-xs text-muted-foreground">Win Rate</span>
                    </div>
                    <p className="text-lg font-bold">
                      {formatPercentage(campaign.metrics.winRate)}
                    </p>
                  </div>
                </div>
                
                <div className="pt-2 border-t space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Cost:</span>
                    <span className="font-medium">{formatCurrency(campaign.cost)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Closed Won:</span>
                    <span className="font-medium">{formatCurrency(campaign.metrics.closedWonValue)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Efficiency:</span>
                    <span className="font-medium">{campaign.metrics.pipelineEfficiency.toFixed(1)}x</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default TopCampaignCards;