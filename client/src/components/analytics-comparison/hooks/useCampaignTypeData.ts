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
  averageROI: number;
  averageWinRate: number;
  totalCampaigns: number;
  totalCustomers: number;
  bestPerformingType: CampaignTypeData | null;
  worstPerformingType: CampaignTypeData | null;
  mostEfficientType: CampaignTypeData | null;
}

export const useCampaignTypeData = (analysisType: 'influenced' | 'new-pipeline' | 'stage-advance' = 'influenced') => {
  const queryKey = analysisType === 'influenced' 
    ? '/api/marketing/comparative/campaign-types'
    : analysisType === 'new-pipeline'
    ? '/api/marketing/comparative/campaign-types-new-pipeline' 
    : '/api/marketing/comparative/campaign-types-stage-advance';

  const { data: rawData, isLoading, error, refetch } = useQuery<CampaignTypeData[]>({
    queryKey: [queryKey],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const processedData = useMemo(() => {
    if (!rawData || rawData.length === 0) return null;

    // Sort data by ROI descending
    const sortedData = [...rawData].sort((a, b) => b.averageROI - a.averageROI);

    // Calculate aggregate metrics
    const totalInvestment = rawData.reduce((sum, item) => sum + item.totalCost, 0);
    const totalPipeline = rawData.reduce((sum, item) => sum + item.totalPipelineValue, 0);
    const totalClosedWon = rawData.reduce((sum, item) => sum + item.totalClosedWonValue, 0);
    const totalCampaigns = rawData.reduce((sum, item) => sum + item.totalCampaigns, 0);
    const totalCustomers = rawData.reduce((sum, item) => sum + item.totalCustomers, 0);

    // Calculate weighted averages
    const averageROI = totalInvestment > 0 ? (totalClosedWon / totalInvestment) * 100 : 0;
    const averageWinRate = rawData.reduce((sum, item, index, arr) => 
      sum + (item.averageWinRate / arr.length), 0
    );

    // Find best/worst/most efficient
    const bestPerformingType = sortedData[0] || null;
    const worstPerformingType = sortedData[sortedData.length - 1] || null;
    const mostEfficientType = [...rawData].sort((a, b) => b.costEfficiency - a.costEfficiency)[0] || null;

    const metrics: CampaignTypeMetrics = {
      totalInvestment,
      totalPipeline,
      totalClosedWon,
      averageROI,
      averageWinRate,
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