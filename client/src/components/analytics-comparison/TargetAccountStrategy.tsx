import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import TargetAccountSummary from './components/TargetAccountSummary';
import TargetAccountMatrix from './components/TargetAccountMatrix';
import TargetAccountInsights from './components/TargetAccountInsights';
import { useTargetAccountData } from './hooks/useTargetAccountData';
import { Target, Users, DollarSign, TrendingUp } from 'lucide-react';

const TargetAccountStrategy: React.FC = () => {
  const { data, isLoading, error, recommendations } = useTargetAccountData();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error loading target account strategy data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No target account strategy data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Target Account Strategy</h2>
          <p className="text-muted-foreground">
            Optimize marketing strategy with target vs non-target account performance analysis
          </p>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Deal Size Advantage</p>
                <p className="text-2xl font-bold text-green-600">
                  {data.comparison.targetAccountAdvantage.dealSizeMultiplier.toFixed(1)}x
                </p>
                <p className="text-xs text-muted-foreground">
                  Target vs Non-Target
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Win Rate Advantage</p>
                <p className="text-2xl font-bold text-blue-600">
                  +{formatPercentage(data.comparison.targetAccountAdvantage.winRateAdvantage)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Target Account Benefit
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Target Account ROI</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatPercentage(data.targetAccounts.roi)}
                </p>
                <p className="text-xs text-muted-foreground">
                  vs {formatPercentage(data.nonTargetAccounts.roi)} Non-Target
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Attendee Efficiency</p>
                <p className="text-2xl font-bold text-orange-600">
                  {data.comparison.targetAccountAdvantage.attendeeEfficiency.toFixed(1)}x
                </p>
                <p className="text-xs text-muted-foreground">
                  Target vs Non-Target
                </p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Target vs Non-Target Summary */}
      <TargetAccountSummary data={data} />

      {/* Strategic Engagement Matrix */}
      <TargetAccountMatrix data={data} />

      {/* Strategic Insights and Recommendations */}
      <TargetAccountInsights data={data} recommendations={recommendations} />
    </div>
  );
};

export default TargetAccountStrategy;