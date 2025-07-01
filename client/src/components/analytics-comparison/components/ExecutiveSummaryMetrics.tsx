import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, Target, Award } from 'lucide-react';

interface ExecutiveSummaryMetricsProps {
  metrics: {
    totalPipeline: number;
    totalClosedWon: number;
    averageROI: number;
    averageWinRate: number;
  };
  formatCurrency: Intl.NumberFormat;
  formatPercentage: (value: number) => string;
}

const ExecutiveSummaryMetrics: React.FC<ExecutiveSummaryMetricsProps> = ({
  metrics,
  formatCurrency,
  formatPercentage
}) => {
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
      case 'positive':
        return 'text-green-600 dark:text-green-400';
      case 'negative':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-yellow-600 dark:text-yellow-400';
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

export default ExecutiveSummaryMetrics;