import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Trophy, DollarSign, Target, Users, TrendingUp, Award } from 'lucide-react';

interface CampaignComparisonData {
  campaignId: number;
  campaignName: string;
  campaignType: string;
  cost: number;
  startDate: string;
  status: string;
  metrics: {
    totalCustomers: number;
    uniqueOpportunities: number;
    sharedOpportunities: number;
    influenceRate: number;
    targetAccountCustomers: number;
    totalAttendees: number;
    averageAttendees: number;
    pipelineValue: number;
    closedWonValue: number;
    winRate: number;
    cac: number;
    roi: number;
    pipelineEfficiency: number;
    targetAccountWinRate: number;
    attendeeEfficiency: number;
    campaignInfluenceScore: number;
  };
}

interface CampaignTypeMetrics {
  campaignType: string;
  campaignCount: number;
  totalCost: number;
  totalCustomers: number;
  totalPipelineValue: number;
  totalClosedWonValue: number;
  averageROI: number;
  averageWinRate: number;
  averageCAC: number;
  averageInfluenceRate: number;
  targetAccountCustomers: number;
  averageAttendeeEfficiency: number;
  totalAttendees: number;
}

const CampaignTypeAnalysis: React.FC = () => {
  const { data: campaignData, isLoading, error } = useQuery<CampaignComparisonData[]>({
    queryKey: ['/api/marketing/comparative/campaign-comparison'],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Type Analysis</CardTitle>
            <CardDescription>Loading campaign type performance data...</CardDescription>
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
          <CardTitle className="text-red-600">Error Loading Campaign Type Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Unable to load campaign type analysis. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group campaigns by type and calculate metrics
  const campaignTypeMetrics: CampaignTypeMetrics[] = React.useMemo(() => {
    if (!campaignData) return [];

    const typeGroups = campaignData.reduce((acc, campaign) => {
      const type = campaign.campaignType || 'Unknown';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(campaign);
      return acc;
    }, {} as Record<string, CampaignComparisonData[]>);

    return Object.entries(typeGroups).map(([type, campaigns]) => {
      const totalCost = campaigns.reduce((sum, c) => sum + (c.cost || 0), 0);
      const totalCustomers = campaigns.reduce((sum, c) => sum + (c.metrics?.totalCustomers || 0), 0);
      const totalPipelineValue = campaigns.reduce((sum, c) => sum + (c.metrics?.pipelineValue || 0), 0);
      const totalClosedWonValue = campaigns.reduce((sum, c) => sum + (c.metrics?.closedWonValue || 0), 0);
      const targetAccountCustomers = campaigns.reduce((sum, c) => sum + (c.metrics?.targetAccountCustomers || 0), 0);
      const totalAttendees = campaigns.reduce((sum, c) => sum + (c.metrics?.totalAttendees || 0), 0);

      // Calculate averages (excluding zero values)
      const validROIs = campaigns.filter(c => (c.metrics?.roi || 0) > 0).map(c => c.metrics?.roi || 0);
      const validWinRates = campaigns.filter(c => (c.metrics?.winRate || 0) > 0).map(c => c.metrics?.winRate || 0);
      const validCACs = campaigns.filter(c => (c.metrics?.cac || 0) > 0).map(c => c.metrics?.cac || 0);
      const validInfluenceRates = campaigns.filter(c => (c.metrics?.influenceRate || 0) > 0).map(c => c.metrics?.influenceRate || 0);
      const validAttendeeEfficiency = campaigns.filter(c => (c.metrics?.attendeeEfficiency || 0) > 0).map(c => c.metrics?.attendeeEfficiency || 0);

      return {
        campaignType: type,
        campaignCount: campaigns.length,
        totalCost,
        totalCustomers,
        totalPipelineValue,
        totalClosedWonValue,
        averageROI: validROIs.length > 0 ? validROIs.reduce((sum, roi) => sum + roi, 0) / validROIs.length : 0,
        averageWinRate: validWinRates.length > 0 ? validWinRates.reduce((sum, wr) => sum + wr, 0) / validWinRates.length : 0,
        averageCAC: validCACs.length > 0 ? validCACs.reduce((sum, cac) => sum + cac, 0) / validCACs.length : 0,
        averageInfluenceRate: validInfluenceRates.length > 0 ? validInfluenceRates.reduce((sum, ir) => sum + ir, 0) / validInfluenceRates.length : 0,
        targetAccountCustomers,
        averageAttendeeEfficiency: validAttendeeEfficiency.length > 0 ? validAttendeeEfficiency.reduce((sum, ae) => sum + ae, 0) / validAttendeeEfficiency.length : 0,
        totalAttendees,
      };
    }).sort((a, b) => b.averageROI - a.averageROI);
  }, [campaignData]);

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

  const getROIColor = (roi: number) => {
    if (roi >= 500) return 'text-green-600';
    if (roi >= 300) return 'text-blue-600';
    if (roi >= 200) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTypeColor = (index: number) => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
    return colors[index % colors.length];
  };

  // Chart data for ROI comparison
  const chartData = campaignTypeMetrics.map((type, index) => ({
    name: type.campaignType,
    roi: type.averageROI,
    campaigns: type.campaignCount,
    color: getTypeColor(index),
  }));

  const bestPerformingType = campaignTypeMetrics[0];
  const totalROI = campaignTypeMetrics.reduce((sum, type) => sum + (type.averageROI * type.campaignCount), 0) / campaignTypeMetrics.reduce((sum, type) => sum + type.campaignCount, 1);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Campaign Types</p>
                <p className="text-2xl font-bold">{campaignTypeMetrics.length}</p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Best Performing</p>
                <p className="text-lg font-bold text-blue-600">{bestPerformingType?.campaignType || 'N/A'}</p>
                <p className="text-xs text-gray-500">{formatPercentage(bestPerformingType?.averageROI || 0)} ROI</p>
              </div>
              <Award className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average ROI</p>
                <p className="text-2xl font-bold text-green-600">{formatPercentage(totalROI)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pipeline</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(campaignTypeMetrics.reduce((sum, type) => sum + type.totalPipelineValue, 0))}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROI Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Campaign Type ROI Comparison
          </CardTitle>
          <CardDescription>
            Average return on investment by campaign type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    `${formatPercentage(value as number)}`,
                    'ROI'
                  ]}
                  labelFormatter={(label) => `Campaign Type: ${label}`}
                />
                <Bar dataKey="roi" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Campaign Type Performance Analysis
          </CardTitle>
          <CardDescription>
            Comprehensive metrics comparison across all campaign types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign Type</TableHead>
                  <TableHead className="text-center">Campaigns</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Pipeline Value</TableHead>
                  <TableHead className="text-right">Closed Won</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                  <TableHead className="text-right">Win Rate</TableHead>
                  <TableHead className="text-right">CAC</TableHead>
                  <TableHead className="text-right">Customers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaignTypeMetrics.map((typeMetrics, index) => (
                  <TableRow key={typeMetrics.campaignType}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getTypeColor(index) }}
                        />
                        {typeMetrics.campaignType}
                        {index === 0 && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            Best ROI
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{typeMetrics.campaignCount}</TableCell>
                    <TableCell className="text-right">{formatCurrency(typeMetrics.totalCost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(typeMetrics.totalPipelineValue)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(typeMetrics.totalClosedWonValue)}</TableCell>
                    <TableCell className={`text-right font-bold ${getROIColor(typeMetrics.averageROI)}`}>
                      {formatPercentage(typeMetrics.averageROI)}
                    </TableCell>
                    <TableCell className="text-right">{formatPercentage(typeMetrics.averageWinRate)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(typeMetrics.averageCAC)}</TableCell>
                    <TableCell className="text-right">{typeMetrics.totalCustomers.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Strategic Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Campaign Type Strategy Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {campaignTypeMetrics.length > 0 && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-green-800">Top Performing Campaign Type</h4>
                <p className="text-sm text-green-700">
                  <strong>{bestPerformingType.campaignType}</strong> campaigns deliver the highest ROI at{' '}
                  {formatPercentage(bestPerformingType.averageROI)} with {bestPerformingType.campaignCount} campaigns generating{' '}
                  {formatCurrency(bestPerformingType.totalPipelineValue)} in pipeline value.
                </p>
              </div>
            )}

            {campaignTypeMetrics.length >= 2 && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-blue-800">Performance Comparison</h4>
                <p className="text-sm text-blue-700">
                  {bestPerformingType.campaignType} campaigns outperform the average by{' '}
                  {formatPercentage(bestPerformingType.averageROI - totalROI)} ROI and generate{' '}
                  {formatCurrency(bestPerformingType.totalPipelineValue / bestPerformingType.campaignCount)} average pipeline per campaign.
                </p>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Campaign Type Efficiency Metrics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Most Campaigns</p>
                  <p className="font-bold">
                    {campaignTypeMetrics.reduce((max, type) => 
                      type.campaignCount > max.campaignCount ? type : max
                    ).campaignType}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Highest Pipeline</p>
                  <p className="font-bold">
                    {campaignTypeMetrics.reduce((max, type) => 
                      type.totalPipelineValue > max.totalPipelineValue ? type : max
                    ).campaignType}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Best Win Rate</p>
                  <p className="font-bold">
                    {campaignTypeMetrics.reduce((max, type) => 
                      type.averageWinRate > max.averageWinRate ? type : max
                    ).campaignType}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Lowest CAC</p>
                  <p className="font-bold">
                    {campaignTypeMetrics.filter(t => t.averageCAC > 0).reduce((min, type) => 
                      type.averageCAC < min.averageCAC ? type : min
                    )?.campaignType || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CampaignTypeAnalysis;