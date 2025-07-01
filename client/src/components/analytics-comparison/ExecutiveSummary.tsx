import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, DollarSign, Target, Award, AlertTriangle, Lightbulb, Trophy, Zap } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';

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

  // Inline metrics component
  const MetricsCards = ({ metrics }: { metrics: ExecutiveSummaryData['metrics'] }) => {
    const metricCards = [
      {
        title: 'Total Pipeline',
        value: formatCurrency.format(metrics.totalPipeline),
        icon: TrendingUp,
        description: 'Active pipeline value across all campaigns',
        trend: metrics.totalPipeline > 0 ? 'positive' : 'neutral'
      },
      {
        title: 'Total Closed Won',
        value: formatCurrency.format(metrics.totalClosedWon),
        icon: Award,
        description: 'Total revenue from closed deals',
        trend: metrics.totalClosedWon > 0 ? 'positive' : 'neutral'
      },
      {
        title: 'Average ROI',
        value: formatPercentage(metrics.averageROI),
        icon: DollarSign,
        description: 'Weighted average return on investment',
        trend: metrics.averageROI > 100 ? 'positive' : metrics.averageROI > 50 ? 'neutral' : 'negative'
      },
      {
        title: 'Average Win Rate',
        value: formatPercentage(metrics.averageWinRate),
        icon: Target,
        description: 'Weighted average across all campaigns',
        trend: metrics.averageWinRate > 30 ? 'positive' : metrics.averageWinRate > 20 ? 'neutral' : 'negative'
      }
    ];

    const getTrendColor = (trend: string) => {
      switch (trend) {
        case 'positive': return 'text-green-600 dark:text-green-400';
        case 'negative': return 'text-red-600 dark:text-red-400';
        default: return 'text-yellow-600 dark:text-yellow-400';
      }
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${getTrendColor(card.trend)}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getTrendColor(card.trend)}`}>
                  {card.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // Inline chart component
  const PipelineChart = ({ data }: { data: ExecutiveSummaryData['timeSeriesData'] }) => {
    const chartData = useMemo(() => {
      return data.map(item => ({
        ...item,
        formattedDate: format(parseISO(item.date), 'MMM yyyy'),
        displayDate: format(parseISO(item.date), 'MMM yyyy')
      })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [data]);

    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-background border border-border rounded-lg shadow-lg p-3">
            <p className="font-semibold text-foreground mb-2">{label}</p>
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-sm text-muted-foreground">
                  {entry.name}: {formatCurrency.format(entry.value)}
                </span>
              </div>
            ))}
          </div>
        );
      }
      return null;
    };

    if (!chartData || chartData.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <p>No time series data available</p>
        </div>
      );
    }

    return (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="displayDate" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line type="monotone" dataKey="pipelineValue" stroke="hsl(var(--primary))" strokeWidth={2} name="Pipeline Value" />
            <Line type="monotone" dataKey="closedWonValue" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Closed Won Value" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Inline insights component
  const InsightsCards = ({ insights }: { insights: ExecutiveSummaryData['insights'] }) => {
    const insightCards = [
      {
        title: 'Best Performing Campaign Type',
        icon: Trophy,
        value: insights.bestPerformingCampaignType.name,
        metric: formatPercentage(insights.bestPerformingCampaignType.roi),
        subMetric: formatCurrency.format(insights.bestPerformingCampaignType.value),
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-950',
        borderColor: 'border-green-200 dark:border-green-800'
      },
      {
        title: 'Pipeline Efficiency Leader',
        icon: Zap,
        value: insights.bestPipelineEfficiency.name,
        metric: `$${insights.bestPipelineEfficiency.efficiency.toFixed(2)}`,
        subMetric: formatCurrency.format(insights.bestPipelineEfficiency.value),
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-950',
        borderColor: 'border-blue-200 dark:border-blue-800'
      }
    ];

    if (insights.mostInefficientCampaignType) {
      insightCards.push({
        title: 'Optimization Opportunity',
        icon: AlertTriangle,
        value: insights.mostInefficientCampaignType.name,
        metric: formatPercentage(insights.mostInefficientCampaignType.roi),
        subMetric: `${insights.mostInefficientCampaignType.costPercentage.toFixed(1)}% of budget`,
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-950',
        borderColor: 'border-orange-200 dark:border-orange-800'
      });
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {insightCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index} className={`${card.borderColor} ${card.bgColor} hover:shadow-md transition-all duration-200`}>
              <CardHeader className="pb-3">
                <CardTitle className={`text-sm font-medium ${card.color} flex items-center gap-2`}>
                  <Icon className="h-4 w-4" />
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className={`text-lg font-bold ${card.color}`}>{card.value}</div>
                  <div className="flex items-center justify-between text-sm">
                    <span className={`font-semibold ${card.color}`}>{card.metric}</span>
                    <span className="text-muted-foreground text-xs">{card.subMetric}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

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
      <MetricsCards metrics={summaryData.metrics} />

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
          <PipelineChart data={summaryData.timeSeriesData} />
        </CardContent>
      </Card>

      {/* Executive Insights */}
      <InsightsCards insights={summaryData.insights} />

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