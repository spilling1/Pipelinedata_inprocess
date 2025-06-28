import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, DollarSign, Users, Award } from 'lucide-react';

interface TargetAccountAnalytics {
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

const TargetAccountAnalytics: React.FC = () => {
  const { data, isLoading, error } = useQuery<TargetAccountAnalytics>({
    queryKey: ['/api/marketing/comparative/target-accounts'],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Target Account Analytics</CardTitle>
            <CardDescription>Loading target account performance comparison...</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Error Loading Target Account Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Unable to load target account analytics. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const getAdvantageColor = (multiplier: number) => {
    if (multiplier >= 2) return 'text-green-600';
    if (multiplier >= 1.5) return 'text-blue-600';
    if (multiplier >= 1.1) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAdvantageLevel = (multiplier: number) => {
    if (multiplier >= 2) return 'Excellent';
    if (multiplier >= 1.5) return 'Strong';
    if (multiplier >= 1.1) return 'Moderate';
    return 'Limited';
  };

  return (
    <div className="space-y-6">
      {/* Comparison Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Deal Size Advantage</p>
                <p className={`text-2xl font-bold ${getAdvantageColor(data?.comparison.targetAccountAdvantage.dealSizeMultiplier || 0)}`}>
                  {data?.comparison.targetAccountAdvantage.dealSizeMultiplier.toFixed(1)}x
                </p>
                <p className="text-xs text-gray-500">
                  {getAdvantageLevel(data?.comparison.targetAccountAdvantage.dealSizeMultiplier || 0)}
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
                <p className="text-sm font-medium text-gray-600">Win Rate Advantage</p>
                <p className={`text-2xl font-bold ${data && data.comparison.targetAccountAdvantage.winRateAdvantage > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data && data.comparison.targetAccountAdvantage.winRateAdvantage > 0 ? '+' : ''}
                  {formatPercentage(data?.comparison.targetAccountAdvantage.winRateAdvantage || 0)}
                </p>
                <p className="text-xs text-gray-500">vs Non-targets</p>
              </div>
              <Award className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Attendee Efficiency</p>
                <p className={`text-2xl font-bold ${getAdvantageColor(data?.comparison.targetAccountAdvantage.attendeeEfficiency || 0)}`}>
                  {data?.comparison.targetAccountAdvantage.attendeeEfficiency.toFixed(1)}x
                </p>
                <p className="text-xs text-gray-500">Pipeline per attendee</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Target Accounts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Target Accounts Performance
            </CardTitle>
            <CardDescription>
              Strategic account performance metrics and insights
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Customer Count</p>
                <p className="text-2xl font-bold text-blue-600">
                  {data?.targetAccounts.customerCount.toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Pipeline Value</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(data?.targetAccounts.totalPipelineValue || 0)}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Average Deal Size</span>
                  <span className="text-sm font-bold">
                    {formatCurrency(data?.targetAccounts.averageDealSize || 0)}
                  </span>
                </div>
                <Progress value={75} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Win Rate</span>
                  <span className="text-sm font-bold">
                    {formatPercentage(data?.targetAccounts.winRate || 0)}
                  </span>
                </div>
                <Progress value={data?.targetAccounts.winRate || 0} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">ROI</span>
                  <span className="text-sm font-bold">
                    {formatPercentage(data?.targetAccounts.roi || 0)}
                  </span>
                </div>
                <Progress value={Math.min((data?.targetAccounts.roi || 0) / 10, 100)} className="h-2" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-sm text-gray-600">Closed Won</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(data?.targetAccounts.closedWonValue || 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Avg Attendees</p>
                <p className="text-lg font-bold">
                  {data?.targetAccounts.averageAttendees.toFixed(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Non-Target Accounts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gray-600" />
              Non-Target Accounts Performance
            </CardTitle>
            <CardDescription>
              Regular prospect performance for comparison baseline
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Customer Count</p>
                <p className="text-2xl font-bold text-gray-600">
                  {data?.nonTargetAccounts.customerCount.toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Pipeline Value</p>
                <p className="text-2xl font-bold text-gray-600">
                  {formatCurrency(data?.nonTargetAccounts.totalPipelineValue || 0)}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Average Deal Size</span>
                  <span className="text-sm font-bold">
                    {formatCurrency(data?.nonTargetAccounts.averageDealSize || 0)}
                  </span>
                </div>
                <Progress value={50} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Win Rate</span>
                  <span className="text-sm font-bold">
                    {formatPercentage(data?.nonTargetAccounts.winRate || 0)}
                  </span>
                </div>
                <Progress value={data?.nonTargetAccounts.winRate || 0} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">ROI</span>
                  <span className="text-sm font-bold">
                    {formatPercentage(data?.nonTargetAccounts.roi || 0)}
                  </span>
                </div>
                <Progress value={Math.min((data?.nonTargetAccounts.roi || 0) / 10, 100)} className="h-2" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-sm text-gray-600">Closed Won</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(data?.nonTargetAccounts.closedWonValue || 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Avg Attendees</p>
                <p className="text-lg font-bold">
                  {data?.nonTargetAccounts.averageAttendees.toFixed(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strategic Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Target Account Strategy Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data && data.comparison.targetAccountAdvantage.dealSizeMultiplier >= 1.5 && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-green-800">Strong Target Account Performance</h4>
                <p className="text-sm text-green-700">
                  Target accounts show {data.comparison.targetAccountAdvantage.dealSizeMultiplier.toFixed(1)}x larger average deal sizes
                  ({formatCurrency(data.targetAccounts.averageDealSize)} vs {formatCurrency(data.nonTargetAccounts.averageDealSize)}).
                  Focus resources on target account engagement for maximum ROI.
                </p>
              </div>
            )}

            {data && data.comparison.targetAccountAdvantage.winRateAdvantage > 10 && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-blue-800">Win Rate Advantage Detected</h4>
                <p className="text-sm text-blue-700">
                  Target accounts have a {formatPercentage(data.comparison.targetAccountAdvantage.winRateAdvantage)} higher win rate
                  than non-target accounts. This indicates strong account qualification and targeting effectiveness.
                </p>
              </div>
            )}

            {data && data.comparison.targetAccountAdvantage.attendeeEfficiency >= 2 && (
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-purple-800">Excellent Attendee Efficiency</h4>
                <p className="text-sm text-purple-700">
                  Target accounts generate {data.comparison.targetAccountAdvantage.attendeeEfficiency.toFixed(1)}x more pipeline value per attendee.
                  Consider increasing attendee allocation to target account campaigns for enhanced efficiency.
                </p>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Key Performance Metrics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Target Account Count</p>
                  <p className="font-bold">{data?.targetAccounts.customerCount}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Pipeline</p>
                  <p className="font-bold">{formatCurrency((data?.targetAccounts.totalPipelineValue || 0) + (data?.nonTargetAccounts.totalPipelineValue || 0))}</p>
                </div>
                <div>
                  <p className="text-gray-600">Target Share</p>
                  <p className="font-bold">
                    {formatPercentage(((data?.targetAccounts.totalPipelineValue || 0) / ((data?.targetAccounts.totalPipelineValue || 0) + (data?.nonTargetAccounts.totalPipelineValue || 1))) * 100)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Efficiency Multiplier</p>
                  <p className="font-bold">{data?.comparison.targetAccountAdvantage.attendeeEfficiency.toFixed(1)}x</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TargetAccountAnalytics;