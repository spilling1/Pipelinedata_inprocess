import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export interface CustomerJourneyData {
  customerId: number;
  customerName: string;
  touches: number;
  totalCAC: number;
  pipelineValue: number;
  closedWonValue: number;
  currentStage: string;
  campaignTypes: string[];
  journeyPeriod: number; // days
  firstTouchDate: Date;
  lastTouchDate: Date;
  campaignDetails: Array<{
    campaignId: number;
    campaignName: string;
    campaignType: string;
    touchDate: Date;
    cost: number;
  }>;
}

export interface CustomerJourneyMetrics {
  totalCustomers: number;
  averageTouches: number;
  multiTouchPercentage: number;
  averageJourneyCAC: number;
  totalJourneyValue: number;
  averageJourneyPeriod: number;
  conversionByTouches: Record<number, { customers: number; conversionRate: number }>;
}

export interface CustomerJourneyInsights {
  multiTouchImpact: {
    percentage: number;
    value: number;
    description: string;
  };
  journeyBottlenecks: Array<{
    stage: string;
    dropOffRate: number;
    impact: string;
  }>;
  optimalTouchCount: {
    touches: number;
    conversionRate: number;
    reasoning: string;
  };
  topJourneyPatterns: Array<{
    pattern: string;
    frequency: number;
    conversionRate: number;
    averageValue: number;
  }>;
}

export const useCustomerJourneyData = () => {
  const { data: rawData, isLoading, error, refetch } = useQuery<CustomerJourneyData[]>({
    queryKey: ['/api/marketing/comparative/customer-journey'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const processedData = useMemo(() => {
    if (!rawData || rawData.length === 0) return null;

    // Calculate metrics
    const totalCustomers = rawData.length;
    const totalTouches = rawData.reduce((sum, customer) => sum + customer.touches, 0);
    const averageTouches = totalTouches / totalCustomers;
    
    const multiTouchCustomers = rawData.filter(customer => customer.touches > 1);
    const multiTouchPercentage = (multiTouchCustomers.length / totalCustomers) * 100;
    
    const totalCAC = rawData.reduce((sum, customer) => sum + customer.totalCAC, 0);
    const averageJourneyCAC = totalCAC / totalCustomers;
    
    const totalJourneyValue = rawData.reduce((sum, customer) => 
      sum + customer.pipelineValue + customer.closedWonValue, 0
    );
    
    const totalJourneyPeriod = rawData.reduce((sum, customer) => sum + customer.journeyPeriod, 0);
    const averageJourneyPeriod = totalJourneyPeriod / totalCustomers;

    // Conversion by touches analysis
    const touchGroups = rawData.reduce((acc, customer) => {
      const touchCount = customer.touches;
      if (!acc[touchCount]) {
        acc[touchCount] = [];
      }
      acc[touchCount].push(customer);
      return acc;
    }, {} as Record<number, CustomerJourneyData[]>);

    const conversionByTouches = Object.entries(touchGroups).reduce((acc, [touches, customers]) => {
      const touchNumber = parseInt(touches);
      const convertedCustomers = customers.filter(c => c.closedWonValue > 0);
      const conversionRate = (convertedCustomers.length / customers.length) * 100;
      
      acc[touchNumber] = {
        customers: customers.length,
        conversionRate
      };
      return acc;
    }, {} as Record<number, { customers: number; conversionRate: number }>);

    const metrics: CustomerJourneyMetrics = {
      totalCustomers,
      averageTouches,
      multiTouchPercentage,
      averageJourneyCAC,
      totalJourneyValue,
      averageJourneyPeriod,
      conversionByTouches
    };

    return { data: rawData, metrics };
  }, [rawData]);

  // Customer journey insights
  const insights = useMemo(() => {
    if (!processedData) return null;

    const { data, metrics } = processedData;

    // Multi-touch impact analysis
    const singleTouchCustomers = data.filter(c => c.touches === 1);
    const multiTouchCustomers = data.filter(c => c.touches > 1);
    
    const singleTouchValue = singleTouchCustomers.reduce((sum, c) => 
      sum + c.pipelineValue + c.closedWonValue, 0
    );
    const multiTouchValue = multiTouchCustomers.reduce((sum, c) => 
      sum + c.pipelineValue + c.closedWonValue, 0
    );

    const multiTouchImpact = {
      percentage: metrics.multiTouchPercentage,
      value: multiTouchValue,
      description: `Multi-touch customers represent ${metrics.multiTouchPercentage.toFixed(1)}% of customers but generate ${((multiTouchValue / metrics.totalJourneyValue) * 100).toFixed(1)}% of total value`
    };

    // Journey bottlenecks (simplified analysis)
    const stageAnalysis = data.reduce((acc, customer) => {
      const stage = customer.currentStage;
      if (!acc[stage]) {
        acc[stage] = { total: 0, converted: 0 };
      }
      acc[stage].total++;
      if (customer.closedWonValue > 0) {
        acc[stage].converted++;
      }
      return acc;
    }, {} as Record<string, { total: number; converted: number }>);

    const journeyBottlenecks = Object.entries(stageAnalysis)
      .map(([stage, stats]) => ({
        stage,
        dropOffRate: ((stats.total - stats.converted) / stats.total) * 100,
        impact: stats.total > 5 ? 'high' : 'low'
      }))
      .sort((a, b) => b.dropOffRate - a.dropOffRate)
      .slice(0, 3);

    // Optimal touch count analysis
    const touchAnalysis = Object.entries(metrics.conversionByTouches)
      .sort((a, b) => b[1].conversionRate - a[1].conversionRate);
    
    const optimalTouchCount = {
      touches: parseInt(touchAnalysis[0]?.[0] || '2'),
      conversionRate: touchAnalysis[0]?.[1].conversionRate || 0,
      reasoning: `${touchAnalysis[0]?.[0] || 2} touches shows highest conversion rate at ${(touchAnalysis[0]?.[1].conversionRate || 0).toFixed(1)}%`
    };

    // Top journey patterns
    const campaignTypePatterns = data.reduce((acc, customer) => {
      const pattern = customer.campaignTypes.sort().join(' → ');
      if (!acc[pattern]) {
        acc[pattern] = { customers: [], totalValue: 0 };
      }
      acc[pattern].customers.push(customer);
      acc[pattern].totalValue += customer.pipelineValue + customer.closedWonValue;
      return acc;
    }, {} as Record<string, { customers: CustomerJourneyData[]; totalValue: number }>);

    const topJourneyPatterns = Object.entries(campaignTypePatterns)
      .map(([pattern, stats]) => ({
        pattern,
        frequency: stats.customers.length,
        conversionRate: (stats.customers.filter(c => c.closedWonValue > 0).length / stats.customers.length) * 100,
        averageValue: stats.totalValue / stats.customers.length
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);

    const journeyInsights: CustomerJourneyInsights = {
      multiTouchImpact,
      journeyBottlenecks,
      optimalTouchCount,
      topJourneyPatterns
    };

    return journeyInsights;
  }, [processedData]);

  return {
    data: processedData?.data || [],
    metrics: processedData?.metrics || null,
    insights,
    isLoading,
    error,
    refetch,
    isEmpty: !rawData || rawData.length === 0
  };
};