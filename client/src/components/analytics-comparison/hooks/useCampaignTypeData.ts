import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export interface CampaignTypeData {
  campaignType: string;
  totalCampaigns: number;
  totalCost: number;
  totalCustomers: number;
  totalTargetCustomers: number;
  targetAccountPercentage: number;
  totalPipelineValue: number;
  totalClosedWonValue: number;
  totalOpenOpportunities: number;
  totalAttendees: number;
  averageWinRate: number;
  averageROI: number;
  averageTargetAccountWinRate: number;
  costEfficiency: number;
  attendeeEfficiency: number;
  averageCostPerCampaign: number;
  averageCustomersPerCampaign: number;
  averageAttendeesPerCampaign: number;
}

export interface CampaignTypeMetrics {
  totalInvestment: number;
  totalPipeline: number;
  totalClosedWon: number;
  openPipeline: number;
  openPipelineCustomers: number;
  closedWonCustomers: number;
  closedLostCustomers: number;
  averageROI: number;
  averageWinRate: number;
  averageCloseRate: number;
  totalCampaigns: number;
  totalCustomers: number;
  bestPerformingType: CampaignTypeData | null;
  worstPerformingType: CampaignTypeData | null;
  mostEfficientType: CampaignTypeData | null;
}

export const useCampaignTypeData = (
  analysisType: 'influenced' | 'new-pipeline' | 'stage-advance' = 'influenced',
  timePeriod: string = 'fy-to-date'
) => {
  const queryKey = analysisType === 'influenced' 
    ? '/api/marketing/comparative/campaign-types'
    : analysisType === 'new-pipeline'
    ? '/api/marketing/comparative/campaign-types-new-pipeline' 
    : '/api/marketing/comparative/campaign-types-stage-advance';

  const { data: rawResponse, isLoading, error, refetch } = useQuery<{
    campaignTypes: CampaignTypeData[];
    metadata: {
      totalUniqueCustomers: number;
      totalPipelineValue: number;
      totalClosedWonValue: number;
      openPipelineValue: number;
      openPipelineCustomers: number;
      closedWonCustomers: number;
      closedLostCustomers: number;
      timePeriod: string;
      calculatedAt: string;
    };
  }>({
    queryKey: [queryKey, timePeriod],
    queryFn: async () => {
      const url = `${queryKey}?timePeriod=${timePeriod}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch campaign type data');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Extract data and metadata from response
  const rawData = rawResponse?.campaignTypes;
  const metadata = rawResponse?.metadata;

  const processedData = useMemo(() => {
    if (!rawData || rawData.length === 0) return null;

    // Filter out invalid or empty campaign types and normalize data
    const filteredData = rawData.filter(item => 
      item.campaignType && 
      item.campaignType.trim() !== '' && 
      item.campaignType !== 'Unknown' &&
      item.totalCustomers > 0 // Only include types with actual customers
    );

    // Return null if no valid data after filtering
    if (filteredData.length === 0) return null;

    // Normalize data to ensure all properties have default values
    const normalizedData = filteredData.map(item => ({
      campaignType: item.campaignType,
      totalCampaigns: item.totalCampaigns || 0,
      totalCost: item.totalCost || 0,
      totalCustomers: item.totalCustomers || 0,
      totalTargetCustomers: item.totalTargetCustomers || 0,
      targetAccountPercentage: item.targetAccountPercentage || 0,
      totalPipelineValue: item.totalPipelineValue || 0,
      totalClosedWonValue: item.totalClosedWonValue || 0,
      totalOpenOpportunities: item.totalOpenOpportunities || 0,
      totalAttendees: item.totalAttendees || 0,
      averageWinRate: item.averageWinRate || 0,
      averageROI: item.averageROI || 0,
      averageTargetAccountWinRate: item.averageTargetAccountWinRate || 0,
      costEfficiency: item.costEfficiency || 0,
      attendeeEfficiency: item.attendeeEfficiency || 0,
      averageCostPerCampaign: item.averageCostPerCampaign || 0,
      averageCustomersPerCampaign: item.averageCustomersPerCampaign || 0,
      averageAttendeesPerCampaign: item.averageAttendeesPerCampaign || 0,
    }));

    // Sort data by ROI descending
    const sortedData = [...normalizedData].sort((a, b) => b.averageROI - a.averageROI);

    // Calculate aggregate metrics
    const totalInvestment = normalizedData.reduce((sum, item) => sum + item.totalCost, 0);
    // Use actual unique total pipeline from metadata instead of summing campaign type values (avoids double-counting)
    const totalPipeline = metadata?.totalPipelineValue || 0;
    const totalClosedWon = metadata?.totalClosedWonValue || 0;
    const openPipeline = metadata?.openPipelineValue || 0;
    const openPipelineCustomers = metadata?.openPipelineCustomers || 0;
    const closedWonCustomers = metadata?.closedWonCustomers || 0;
    const closedLostCustomers = metadata?.closedLostCustomers || 0;
    const totalCampaigns = normalizedData.reduce((sum, item) => sum + item.totalCampaigns, 0);
    // Use actual unique customers from metadata instead of summing campaign type counts
    const totalCustomers = metadata?.totalUniqueCustomers || 0;

    // Calculate weighted averages
    const averageROI = totalInvestment > 0 ? (totalClosedWon / totalInvestment) * 100 : 0;
    
    // Calculate Win Rate: Closed Won / (Closed Won + Closed Lost)
    const averageWinRate = (closedWonCustomers + closedLostCustomers) > 0 
      ? (closedWonCustomers / (closedWonCustomers + closedLostCustomers)) * 100 
      : 0;
    
    // Calculate Close Rate: Closed Won / (Closed Won + Closed Lost + Open Pipeline)
    const averageCloseRate = (closedWonCustomers + closedLostCustomers + openPipelineCustomers) > 0 
      ? (closedWonCustomers / (closedWonCustomers + closedLostCustomers + openPipelineCustomers)) * 100 
      : 0;

    // Find best/worst/most efficient
    const bestPerformingType = sortedData[0] || null;
    const worstPerformingType = sortedData[sortedData.length - 1] || null;
    const mostEfficientType = [...normalizedData].sort((a, b) => b.costEfficiency - a.costEfficiency)[0] || null;

    const metrics: CampaignTypeMetrics = {
      totalInvestment,
      totalPipeline,
      totalClosedWon,
      openPipeline,
      openPipelineCustomers,
      closedWonCustomers,
      closedLostCustomers,
      averageROI,
      averageWinRate,
      averageCloseRate,
      totalCampaigns,
      totalCustomers,
      bestPerformingType,
      worstPerformingType,
      mostEfficientType,
    };

    return {
      data: sortedData,
      metrics
    };
  }, [rawData]);

  // Performance categorization
  const categorizedData = useMemo(() => {
    if (!processedData?.data) return null;

    const excellent = processedData.data.filter(item => item.averageROI >= 500);
    const good = processedData.data.filter(item => item.averageROI >= 200 && item.averageROI < 500);
    const moderate = processedData.data.filter(item => item.averageROI >= 100 && item.averageROI < 200);
    const poor = processedData.data.filter(item => item.averageROI < 100);

    return {
      excellent,
      good,
      moderate,
      poor,
      total: processedData.data.length
    };
  }, [processedData]);

  // Reallocation analysis
  const reallocationAnalysis = useMemo(() => {
    if (!processedData?.data || !processedData.metrics) return null;

    const averageROI = processedData.metrics.averageROI;
    const totalCost = processedData.metrics.totalInvestment;
    
    // Find inefficient types (>10% of budget, below average ROI)
    const inefficientTypes = processedData.data.filter(item => 
      (item.totalCost / totalCost) > 0.1 && item.averageROI < averageROI
    );

    const reallocationAmount = inefficientTypes.reduce((sum, item) => sum + item.totalCost, 0);
    const potentialGain = processedData.metrics.bestPerformingType 
      ? reallocationAmount * (processedData.metrics.bestPerformingType.averageROI / 100)
      : 0;

    return {
      inefficientTypes,
      reallocationAmount,
      potentialGain,
      reallocationPercentage: totalCost > 0 ? (reallocationAmount / totalCost) * 100 : 0,
      recommendedTarget: processedData.metrics.bestPerformingType?.campaignType || 'N/A'
    };
  }, [processedData]);

  // Trend analysis (based on efficiency and ROI correlation)
  const trendAnalysis = useMemo(() => {
    if (!processedData?.data) return null;

    // Calculate correlations and trends
    const roiEfficiencyCorrelation = processedData.data.map(item => ({
      type: item.campaignType,
      roi: item.averageROI,
      efficiency: item.costEfficiency,
      scalability: item.totalCampaigns > 3 ? 'High' : item.totalCampaigns > 1 ? 'Medium' : 'Low'
    }));

    // Find rising stars (good efficiency, moderate ROI, scalable)
    const risingStars = roiEfficiencyCorrelation.filter(item => 
      item.efficiency > 10 && item.roi > 100 && item.scalability !== 'Low'
    );

    return {
      roiEfficiencyCorrelation,
      risingStars,
      totalTypes: processedData.data.length
    };
  }, [processedData]);

  return {
    data: processedData?.data || [],
    metrics: processedData?.metrics || null,
    categorizedData,
    reallocationAnalysis,
    trendAnalysis,
    isLoading,
    error,
    refetch,
    isEmpty: !rawData || rawData.length === 0
  };
};

export default useCampaignTypeData;