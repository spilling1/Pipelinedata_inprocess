import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, AlertCircle, Zap, ArrowUp, ArrowDown } from 'lucide-react';

interface ExecutiveInsightsProps {
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
  formatCurrency: Intl.NumberFormat;
  formatPercentage: (value: number) => string;
}

const ExecutiveInsights: React.FC<ExecutiveInsightsProps> = ({
  insights,
  formatCurrency,
  formatPercentage
}) => {
  const insightCards = [
    {
      title: 'Best Performing Campaign Type',
      icon: Trophy,
      description: 'Highest ROI campaign type',
      value: insights.bestPerformingCampaignType.name,
      metric: formatPercentage(insights.bestPerformingCampaignType.roi),
      subMetric: formatCurrency.format(insights.bestPerformingCampaignType.value),
      trend: 'positive',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950',
      borderColor: 'border-green-200 dark:border-green-800'
    },
    {
      title: 'Pipeline Efficiency Leader',
      icon: Zap,
      description: 'Best pipeline per dollar invested',
      value: insights.bestPipelineEfficiency.name,
      metric: `$${insights.bestPipelineEfficiency.efficiency.toFixed(2)}`,
      subMetric: formatCurrency.format(insights.bestPipelineEfficiency.value),
      trend: 'positive',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      borderColor: 'border-blue-200 dark:border-blue-800'
    }
  ];

  // Add inefficient campaign type if it exists
  if (insights.mostInefficientCampaignType) {
    insightCards.push({
      title: 'Optimization Opportunity',
      icon: AlertCircle,
      description: 'Lowest ROI with significant spend',
      value: insights.mostInefficientCampaignType.name,
      metric: formatPercentage(insights.mostInefficientCampaignType.roi),
      subMetric: `${insights.mostInefficientCampaignType.costPercentage.toFixed(1)}% of budget`,
      trend: 'negative',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      borderColor: 'border-orange-200 dark:border-orange-800'
    });
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'positive':
        return <ArrowUp className="h-4 w-4" />;
      case 'negative':
        return <ArrowDown className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {insightCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card 
            key={index} 
            className={`${card.borderColor} ${card.bgColor} hover:shadow-md transition-all duration-200`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className={`text-sm font-medium ${card.color} flex items-center gap-2`}>
                  <Icon className="h-4 w-4" />
                  {card.title}
                </CardTitle>
                {getTrendIcon(card.trend) && (
                  <div className={card.color}>
                    {getTrendIcon(card.trend)}
                  </div>
                )}
              </div>
              <CardDescription className="text-xs">
                {card.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className={`text-lg font-bold ${card.color}`}>
                  {card.value}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={`font-semibold ${card.color}`}>
                    {card.metric}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {card.subMetric}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ExecutiveInsights;