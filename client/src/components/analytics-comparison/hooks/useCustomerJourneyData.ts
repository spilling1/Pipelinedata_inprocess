import { useQuery } from '@tanstack/react-query';

export interface CustomerJourneyData {
  customerName: string;
  totalTouches: number;
  lastTouchDate: string;
  enteredPipelineDate: string | null;
  campaigns: Array<{
    campaignName: string;
    campaignType: string;
    eventDate: string;
    touchCount: number;
  }>;
  currentStage: string;
  pipelineValue: number;
  isClosedWon: boolean;
  closedWonValue: number;
  daysFromFirstTouchToPipeline: number | null;
  daysFromFirstTouchToClose: number | null;
}

export interface CustomerJourneyMetrics {
  totalCustomers: number;
  avgTouchesPerCustomer: number;
  avgDaysToEnterPipeline: number;
  avgDaysToClose: number;
  pipelineConversionRate: number;
  closeConversionRate: number;
  totalCampaignCosts: number;
  totalPipelineValue: number;
  totalClosedWonValue: number;
  averageCACByTouches: Array<{
    touchCount: number;
    customers: number;
    cumulativeCAC: number;
    pipelineValue: number;
    closedWonValue: number;
    efficiency: number;
  }>;
  optimalTouchCount: {
    touches: number;
    efficiency: number;
    recommendation: string;
  };
}

export interface CustomerJourneyInsights {
  journeyBottlenecks: Array<{
    stage: string;
    issue: string;
    impact: string;
    recommendation: string;
  }>;
  touchEfficiency: {
    mostEfficient: { touches: number; cac: number; efficiency: number };
    leastEfficient: { touches: number; cac: number; efficiency: number };
    recommendation: string;
  };
  conversionInsights: {
    bestPerformingPath: string;
    averageJourneyLength: number;
    quickestConversion: number;
    longestConversion: number;
  };
  strategicRecommendations: string[];
}

export interface CustomerJourneyResponse {
  customers: CustomerJourneyData[];
  metrics: CustomerJourneyMetrics;
  insights: CustomerJourneyInsights;
}

interface CustomerJourneyApiResponse {
  customers: CustomerJourneyData[];
  summary: {
    averageTouchesPerCustomer: number;
    totalCustomersWithMultipleTouches: number;
    totalUniqueCustomers: number;
    touchDistribution: Array<{
      touches: number;
      customerCount: number;
      percentage: number;
    }>;
  };
}

export const useCustomerJourneyData = () => {
  const { data, isLoading, error } = useQuery<CustomerJourneyApiResponse>({
    queryKey: ['/api/marketing/comparative/customer-journey'],
  });

  return { 
    data: data?.customers || [], 
    summary: data?.summary || null, 
    loading: isLoading, 
    error: error?.message || null,
    isLoading,
    // Backwards compatibility for other potential properties
    insights: null,
    metrics: data?.summary || null
  };
};