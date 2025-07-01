import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, DollarSign, Target, Award, AlertTriangle, Lightbulb } from 'lucide-react';
import ExecutiveSummaryMetrics from './components/ExecutiveSummaryMetrics';
import PipelineOverTimeChart from './components/PipelineOverTimeChart';
import ExecutiveInsights from './components/ExecutiveInsights';

interface ExecutiveSummaryData {
  metrics: {
    totalPipeline: number;
    totalClosedWon: number;
    averageROI: number;
    averageWinRate: number;
  };
  timeSeriesData: Array<{
    date: string;
    pipelineValue: number;
    closedWonValue: number;
  }>;
  insights: {
    bestPerformingCampaignType: {
      name: string;
      roi: number;
      value: number;
    };
    mostInefficientCampaignType: {
      name: string;
      roi: number;
      costPercentage: number;
    } | null;
    bestPipelineEfficiency: {
      name: string;
      efficiency: number;
      value: number;
    };
  };
  summaryText: string;
}

const ExecutiveSummary: React.FC = () => {
  const { data: summaryData, isLoading, error } = useQuery<ExecutiveSummaryData>({
    queryKey: ['/api/marketing/comparative/executive-summary'],
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const formatCurrency = useMemo(() => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }, []);

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-64 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !summaryData) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span>Failed to load executive summary data</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Executive Summary Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Executive Summary</h2>
          <p className="text-muted-foreground">
            Comprehensive marketing performance overview and strategic insights
          </p>
        </div>
      </div>

      {/* Metrics Summary Row */}
      <ExecutiveSummaryMetrics 
        metrics={summaryData.metrics}
        formatCurrency={formatCurrency}
        formatPercentage={formatPercentage}
      />

      {/* Pipeline Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Pipeline & Revenue Trends
          </CardTitle>
          <CardDescription>
            12-month trend analysis of pipeline development and closed won revenue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PipelineOverTimeChart 
            data={summaryData.timeSeriesData}
            formatCurrency={formatCurrency}
          />
        </CardContent>
      </Card>

      {/* Executive Insights */}
      <ExecutiveInsights 
        insights={summaryData.insights}
        summaryText={summaryData.summaryText}
        formatCurrency={formatCurrency}
        formatPercentage={formatPercentage}
      />

      {/* Strategic Summary Callout */}
      <Card className="border-primary bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Lightbulb className="h-5 w-5" />
            Strategic Recommendation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground leading-relaxed">
            {summaryData.summaryText}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExecutiveSummary;