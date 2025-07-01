import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';

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

export const useCustomerJourneyData = () => {
  const [data, setData] = useState<CustomerJourneyData[] | null>(null);
  const [summary, setSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomerJourneyData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await apiRequest('/api/marketing/comparative/customer-journey');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch customer journey data: ${response.statusText}`);
        }
        
        const journeyData = await response.json();
        setData(journeyData.customers || []);
        setSummary(journeyData.summary || null);
        
      } catch (err) {
        console.error('Error fetching customer journey data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch customer journey data');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerJourneyData();
  }, []);

  return { 
    data, 
    summary, 
    loading, 
    error,
    isLoading: loading,
    // Backwards compatibility for other potential properties
    insights: null,
    metrics: summary
  };
};