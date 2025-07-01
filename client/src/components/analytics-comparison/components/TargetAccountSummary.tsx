import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Target, Users } from 'lucide-react';
import type { TargetAccountAnalytics } from '../hooks/useTargetAccountData';

interface TargetAccountSummaryProps {
  data: TargetAccountAnalytics;
}

const TargetAccountSummary: React.FC<TargetAccountSummaryProps> = ({ data }) => {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const getComparisonIcon = (targetValue: number, nonTargetValue: number) => {
    return targetValue > nonTargetValue ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  const getComparisonColor = (targetValue: number, nonTargetValue: number) => {
    return targetValue > nonTargetValue ? 'text-green-600' : 'text-red-600';
  };

  const tableData = [
    {
      metric: 'Customer Count',
      target: data.targetAccounts.customerCount,
      nonTarget: data.nonTargetAccounts.customerCount,
      format: 'number'
    },
    {
      metric: 'Pipeline Value',
      target: data.targetAccounts.totalPipelineValue,
      nonTarget: data.nonTargetAccounts.totalPipelineValue,
      format: 'currency'
    },
    {
      metric: 'Closed Won Value',
      target: data.targetAccounts.closedWonValue,
      nonTarget: data.nonTargetAccounts.closedWonValue,
      format: 'currency'
    },
    {
      metric: 'Average Deal Size',
      target: data.targetAccounts.averageDealSize,
      nonTarget: data.nonTargetAccounts.averageDealSize,
      format: 'currency'
    },
    {
      metric: 'Win Rate',
      target: data.targetAccounts.winRate,
      nonTarget: data.nonTargetAccounts.winRate,
      format: 'percentage'
    },
    {
      metric: 'ROI',
      target: data.targetAccounts.roi,
      nonTarget: data.nonTargetAccounts.roi,
      format: 'percentage'
    },
    {
      metric: 'Average Attendees',
      target: data.targetAccounts.averageAttendees,
      nonTarget: data.nonTargetAccounts.averageAttendees,
      format: 'decimal'
    },
    {
      metric: 'Pipeline Efficiency',
      target: data.targetAccounts.pipelineEfficiency,
      nonTarget: data.nonTargetAccounts.pipelineEfficiency,
      format: 'multiplier'
    }
  ];

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percentage':
        return formatPercentage(value);
      case 'decimal':
        return value.toFixed(1);
      case 'multiplier':
        return `${value.toFixed(1)}x`;
      default:
        return value.toLocaleString();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Summary Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Target Account Performance
          </CardTitle>
          <CardDescription>
            Key metrics for target account campaigns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Pipeline Value</p>
              <p className="text-2xl font-bold">
                {formatCurrency(data.targetAccounts.totalPipelineValue)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Closed Won</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(data.targetAccounts.closedWonValue)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Win Rate</p>
              <p className="text-xl font-bold">
                {formatPercentage(data.targetAccounts.winRate)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Average Deal Size</p>
              <p className="text-xl font-bold">
                {formatCurrency(data.targetAccounts.averageDealSize)}
              </p>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Customers:</span>
              <span className="font-medium">{data.targetAccounts.customerCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ROI:</span>
              <span className="font-medium text-green-600">
                {formatPercentage(data.targetAccounts.roi)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-600" />
            Non-Target Account Performance
          </CardTitle>
          <CardDescription>
            Key metrics for non-target account campaigns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Pipeline Value</p>
              <p className="text-2xl font-bold">
                {formatCurrency(data.nonTargetAccounts.totalPipelineValue)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Closed Won</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(data.nonTargetAccounts.closedWonValue)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Win Rate</p>
              <p className="text-xl font-bold">
                {formatPercentage(data.nonTargetAccounts.winRate)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Average Deal Size</p>
              <p className="text-xl font-bold">
                {formatCurrency(data.nonTargetAccounts.averageDealSize)}
              </p>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Customers:</span>
              <span className="font-medium">{data.nonTargetAccounts.customerCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ROI:</span>
              <span className="font-medium text-green-600">
                {formatPercentage(data.nonTargetAccounts.roi)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Target vs Non-Target Comparison</CardTitle>
          <CardDescription>
            Detailed metric comparison between target and non-target accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="text-center">Target Accounts</TableHead>
                <TableHead className="text-center">Non-Target Accounts</TableHead>
                <TableHead className="text-center">Advantage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((row) => {
                const advantage = row.target > row.nonTarget;
                const difference = row.format === 'percentage' 
                  ? row.target - row.nonTarget
                  : ((row.target / row.nonTarget) - 1) * 100;
                
                return (
                  <TableRow key={row.metric}>
                    <TableCell className="font-medium">{row.metric}</TableCell>
                    <TableCell className="text-center font-medium">
                      {formatValue(row.target, row.format)}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {formatValue(row.nonTarget, row.format)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {getComparisonIcon(row.target, row.nonTarget)}
                        <Badge 
                          variant={advantage ? "default" : "destructive"}
                          className={advantage ? "bg-green-100 text-green-800" : ""}
                        >
                          {advantage ? '+' : ''}{difference.toFixed(1)}%
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default TargetAccountSummary;