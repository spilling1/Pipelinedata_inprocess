import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { Target, Users, TrendingUp, DollarSign } from 'lucide-react';

interface TargetAccountData {
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

const TargetAccountStrategySimple: React.FC = () => {
  const { data, isLoading, error } = useQuery<TargetAccountData>({
    queryKey: ['/api/marketing/comparative/target-accounts'],
  });

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Target Account Strategy</h2>
          <p className="text-muted-foreground">
            Performance comparison between target accounts and non-target accounts with strategic insights
          </p>
        </div>
      </div>

      {/* Performance Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Target Accounts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Target Accounts
            </CardTitle>
            <CardDescription>High-priority customer performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold">{data.targetAccounts.customerCount}</div>
                <div className="text-sm text-muted-foreground">Customers</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{formatCurrency(data.targetAccounts.averageDealSize)}</div>
                <div className="text-sm text-muted-foreground">Avg Deal Size</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{data.targetAccounts.winRate.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Win Rate</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{formatCurrency(data.targetAccounts.totalPipelineValue)}</div>
                <div className="text-sm text-muted-foreground">Total Pipeline</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Non-Target Accounts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-600" />
              Non-Target Accounts
            </CardTitle>
            <CardDescription>Standard customer performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold">{data.nonTargetAccounts.customerCount}</div>
                <div className="text-sm text-muted-foreground">Customers</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{formatCurrency(data.nonTargetAccounts.averageDealSize)}</div>
                <div className="text-sm text-muted-foreground">Avg Deal Size</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{data.nonTargetAccounts.winRate.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Win Rate</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{formatCurrency(data.nonTargetAccounts.totalPipelineValue)}</div>
                <div className="text-sm text-muted-foreground">Total Pipeline</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strategic Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Strategic Insights
          </CardTitle>
          <CardDescription>
            Performance advantages and resource allocation recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">
                {data.comparison.targetAccountAdvantage.dealSizeMultiplier.toFixed(1)}x
              </div>
              <div className="text-sm font-medium text-blue-800">Deal Size Advantage</div>
              <div className="text-xs text-blue-600 mt-1">Target vs Non-Target</div>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">
                +{data.comparison.targetAccountAdvantage.winRateAdvantage.toFixed(1)}%
              </div>
              <div className="text-sm font-medium text-green-800">Win Rate Advantage</div>
              <div className="text-xs text-green-600 mt-1">Higher conversion rate</div>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">
                {data.comparison.targetAccountAdvantage.attendeeEfficiency.toFixed(1)}x
              </div>
              <div className="text-sm font-medium text-purple-800">Attendee Efficiency</div>
              <div className="text-xs text-purple-600 mt-1">Resource optimization</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Breakdown</CardTitle>
          <CardDescription>
            Detailed comparison of target vs non-target account metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Metric</th>
                  <th className="text-left p-2">Target Accounts</th>
                  <th className="text-left p-2">Non-Target Accounts</th>
                  <th className="text-left p-2">Advantage</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium">Customer Count</td>
                  <td className="p-2">{data.targetAccounts.customerCount.toLocaleString()}</td>
                  <td className="p-2">{data.nonTargetAccounts.customerCount.toLocaleString()}</td>
                  <td className="p-2">
                    {data.nonTargetAccounts.customerCount > 0 ? 
                      `${(data.targetAccounts.customerCount / data.nonTargetAccounts.customerCount).toFixed(1)}x` : 
                      'N/A'}
                  </td>
                </tr>
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium">Pipeline Value</td>
                  <td className="p-2">{formatCurrency(data.targetAccounts.totalPipelineValue)}</td>
                  <td className="p-2">{formatCurrency(data.nonTargetAccounts.totalPipelineValue)}</td>
                  <td className="p-2">
                    {data.nonTargetAccounts.totalPipelineValue > 0 ? 
                      `${(data.targetAccounts.totalPipelineValue / data.nonTargetAccounts.totalPipelineValue).toFixed(1)}x` : 
                      'N/A'}
                  </td>
                </tr>
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium">Win Rate</td>
                  <td className="p-2">{data.targetAccounts.winRate.toFixed(1)}%</td>
                  <td className="p-2">{data.nonTargetAccounts.winRate.toFixed(1)}%</td>
                  <td className="p-2">+{(data.targetAccounts.winRate - data.nonTargetAccounts.winRate).toFixed(1)}%</td>
                </tr>
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium">Average Deal Size</td>
                  <td className="p-2">{formatCurrency(data.targetAccounts.averageDealSize)}</td>
                  <td className="p-2">{formatCurrency(data.nonTargetAccounts.averageDealSize)}</td>
                  <td className="p-2">
                    {data.nonTargetAccounts.averageDealSize > 0 ? 
                      `${(data.targetAccounts.averageDealSize / data.nonTargetAccounts.averageDealSize).toFixed(1)}x` : 
                      'N/A'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TargetAccountStrategySimple;