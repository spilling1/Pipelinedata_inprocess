import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export interface CampaignInfluenceData {
  campaignId: number;
  campaignName: string;
  campaignType: string;
  cost: number;
  startDate: Date;
  status: string;
  metrics: {
    totalCustomers: number;
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
  };
}

export interface CampaignInfluenceMetrics {
  totalCampaigns: number;
  averageROI: number;
  totalPipeline: number;
  totalClosedWon: number;
  totalCustomers: number;
  bestCampaign: CampaignInfluenceData | null;
  mostEfficientCampaign: CampaignInfluenceData | null;
}

export const useCampaignInfluenceData = () => {
  const { data: rawData, isLoading, error, refetch } = useQuery<CampaignInfluenceData[]>({
    queryKey: ['/api/marketing/comparative/campaign-comparison'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const processedData = useMemo(() => {
    if (!rawData || rawData.length === 0) return null;

    // Sort campaigns by ROI descending
    const sortedData = [...rawData].sort((a, b) => b.metrics.roi - a.metrics.roi);

    // Calculate aggregate metrics
    const totalCampaigns = rawData.length;
    const totalPipeline = rawData.reduce((sum, campaign) => sum + campaign.metrics.pipelineValue, 0);
    const totalClosedWon = rawData.reduce((sum, campaign) => sum + campaign.metrics.closedWonValue, 0);
    const totalCost = rawData.reduce((sum, campaign) => sum + campaign.cost, 0);
    const totalCustomers = rawData.reduce((sum, campaign) => sum + campaign.metrics.totalCustomers, 0);

    // Calculate weighted averages
    const averageROI = totalCost > 0 ? (totalClosedWon / totalCost) * 100 : 0;

    // Find best performers
    const bestCampaign = sortedData[0] || null;
    const mostEfficientCampaign = [...rawData].sort((a, b) => 
      b.metrics.pipelineEfficiency - a.metrics.pipelineEfficiency
    )[0] || null;

    const metrics: CampaignInfluenceMetrics = {
      totalCampaigns,
      averageROI,
      totalPipeline,
      totalClosedWon,
      totalCustomers,
      bestCampaign,
      mostEfficientCampaign
    };

    return {
      data: sortedData,
      metrics
    };
  }, [rawData]);

  // Performance categorization for campaigns
  const categorizedData = useMemo(() => {
    if (!processedData?.data) return null;

    const highPerformers = processedData.data.filter(campaign => campaign.metrics.roi >= 300);
    const mediumPerformers = processedData.data.filter(campaign => 
      campaign.metrics.roi >= 100 && campaign.metrics.roi < 300
    );
    const lowPerformers = processedData.data.filter(campaign => campaign.metrics.roi < 100);

    return {
      highPerformers,
      mediumPerformers,
      lowPerformers,
      distribution: {
        high: highPerformers.length,
        medium: mediumPerformers.length,
        low: lowPerformers.length
      }
    };
  }, [processedData]);

  // Campaign traits analysis
  const campaignTraits = useMemo(() => {
    if (!processedData?.data) return null;

    const topCampaigns = processedData.data.slice(0, 5);
    
    // Analyze traits of top campaigns
    const typeDistribution = topCampaigns.reduce((acc, campaign) => {
      acc[campaign.campaignType] = (acc[campaign.campaignType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const lowCostCampaigns = topCampaigns.filter(campaign => campaign.cost < 20000).length;
    const targetAccountFocused = topCampaigns.filter(campaign => 
      campaign.metrics.targetAccountCustomers / campaign.metrics.totalCustomers > 0.5
    ).length;

    const dominantType = Object.entries(typeDistribution).reduce((a, b) => 
      typeDistribution[a[0]] > typeDistribution[b[0]] ? a : b
    )[0];

    return {
      dominantType,
      lowCostPercentage: (lowCostCampaigns / topCampaigns.length) * 100,
      targetAccountPercentage: (targetAccountFocused / topCampaigns.length) * 100,
      typeDistribution
    };
  }, [processedData]);

  return {
    data: processedData?.data || [],
    metrics: processedData?.metrics || null,
    categorizedData,
    campaignTraits,
    isLoading,
    error,
    refetch,
    isEmpty: !rawData || rawData.length === 0
  };
};