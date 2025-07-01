import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export interface TargetAccountAnalytics {
  targetAccounts: {
    customerCount: number;
    totalPipelineValue: number;
    closedWonValue: number;
    averageDealSize: number;
    winRate: number;
    totalAttendees: number;
    averageAttendees: number;
    cac: number;
    roi: number;
    pipelineEfficiency: number;
  };
  nonTargetAccounts: {
    customerCount: number;
    totalPipelineValue: number;
    closedWonValue: number;
    averageDealSize: number;
    winRate: number;
    totalAttendees: number;
    averageAttendees: number;
    cac: number;
    roi: number;
    pipelineEfficiency: number;
  };
  comparison: {
    targetAccountAdvantage: {
      dealSizeMultiplier: number;
      winRateAdvantage: number;
      attendeeEfficiency: number;
    };
  };
}

export interface StrategicEngagementMatrix {
  matrix: Array<{
    attendeeRange: string;
    targetAccounts: {
      customerCount: number;
      winRate: number;
      averageDealSize: number;
      roi: number;
    };
    nonTargetAccounts: {
      customerCount: number;
      winRate: number;
      averageDealSize: number;
      roi: number;
    };
  }>;
  recommendations: Array<{
    accountType: 'target' | 'non-target';
    optimalAttendeeRange: string;
    reasoning: string;
    expectedROI: number;
  }>;
}

export const useTargetAccountData = () => {
  const { data: targetData, isLoading: targetLoading, error: targetError } = useQuery<TargetAccountAnalytics>({
    queryKey: ['/api/marketing/comparative/target-accounts'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const { data: matrixData, isLoading: matrixLoading, error: matrixError } = useQuery<StrategicEngagementMatrix>({
    queryKey: ['/api/marketing/comparative/strategic-matrix'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const processedData = useMemo(() => {
    if (!targetData || !matrixData) return null;

    // Enhanced insights
    const insights = {
      targetAccountAdvantage: {
        ...targetData.comparison.targetAccountAdvantage,
        isSignificant: targetData.comparison.targetAccountAdvantage.dealSizeMultiplier >= 1.5,
        winRateImprovement: targetData.comparison.targetAccountAdvantage.winRateAdvantage > 10
      },
      strategicRecommendations: matrixData.recommendations,
      optimalStrategy: matrixData.recommendations.find(r => r.accountType === 'target') || null
    };

    return {
      ...targetData,
      matrix: matrixData,
      insights
    };
  }, [targetData, matrixData]);

  const recommendations = useMemo(() => {
    if (!processedData) return [];

    const recs = [];

    // Deal size advantage recommendation
    if (processedData.insights.targetAccountAdvantage.isSignificant) {
      recs.push({
        type: 'focus-shift',
        title: 'Increase Target Account Focus',
        description: `Target accounts show ${processedData.comparison.targetAccountAdvantage.dealSizeMultiplier.toFixed(1)}x higher deal sizes. Consider allocating more budget to target account campaigns.`,
        impact: 'high',
        metric: 'deal_size'
      });
    }

    // Win rate advantage recommendation
    if (processedData.insights.targetAccountAdvantage.winRateImprovement) {
      recs.push({
        type: 'strategy-optimization',
        title: 'Optimize Target Account Strategy',
        description: `Target accounts have ${processedData.comparison.targetAccountAdvantage.winRateAdvantage.toFixed(1)}% higher win rates. Apply target account strategies to broader campaigns.`,
        impact: 'medium',
        metric: 'win_rate'
      });
    }

    // Attendee efficiency recommendation
    if (processedData.comparison.targetAccountAdvantage.attendeeEfficiency > 1.2) {
      recs.push({
        type: 'resource-allocation',
        title: 'Optimize Attendee Allocation',
        description: `Target accounts show ${processedData.comparison.targetAccountAdvantage.attendeeEfficiency.toFixed(1)}x better attendee efficiency. Focus high-value attendees on target accounts.`,
        impact: 'medium',
        metric: 'efficiency'
      });
    }

    // Strategic matrix recommendations
    if (processedData.insights.optimalStrategy) {
      recs.push({
        type: 'attendee-strategy',
        title: 'Optimal Attendee Strategy',
        description: processedData.insights.optimalStrategy.reasoning,
        impact: 'high',
        metric: 'roi'
      });
    }

    return recs;
  }, [processedData]);

  return {
    data: processedData,
    isLoading: targetLoading || matrixLoading,
    error: targetError || matrixError,
    recommendations,
    isEmpty: !targetData && !matrixData
  };
};