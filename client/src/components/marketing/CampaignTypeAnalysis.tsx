import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Trophy, DollarSign, Target, Users, TrendingUp, Award } from 'lucide-react';

interface CampaignTypeMetrics {
  campaignType: string;
  totalCampaigns: number;
  totalCost: number;
  totalCustomers: number;
  totalTargetCustomers: number;
  targetAccountPercentage: number;
  totalPipelineValue: number;
  totalClosedWonValue: number;
  totalOpenOpportunities: number;
  totalAttendees: number;
  averageWinRate: number;
  averageROI: number;
  averageTargetAccountWinRate: number;
  costEfficiency: number;
  attendeeEfficiency: number;
  averageCostPerCampaign: number;
  averageCustomersPerCampaign: number;
  averageAttendeesPerCampaign: number;
}

const CampaignTypeAnalysis: React.FC = () => {
  const { data: campaignTypeMetrics, isLoading, error } = useQuery<CampaignTypeMetrics[]>({
    queryKey: ['/api/marketing/comparative/campaign-types'],
  });

  // Sort data from backend by ROI (already calculated correctly)
  const sortedCampaignTypeMetrics = React.useMemo(() => {
    if (!campaignTypeMetrics) return [];
    return [...campaignTypeMetrics].sort((a, b) => b.averageROI - a.averageROI);
  }, [campaignTypeMetrics]);

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
            Error loading campaign type analysis data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!sortedCampaignTypeMetrics || sortedCampaignTypeMetrics.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            No campaign type data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Helper functions
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const getTypeColor = (index: number) => {
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];
    return colors[index % colors.length];
  };

  const getROIColor = (roi: number) => {
    if (roi >= 500) return 'text-green-600';
    if (roi >= 200) return 'text-blue-600';
    if (roi >= 100) return 'text-yellow-600';
    return 'text-gray-600';
  };

  // Prepare chart data
  const chartData = sortedCampaignTypeMetrics.map((typeMetrics, index) => ({
    name: typeMetrics.campaignType,
    roi: typeMetrics.averageROI,
    color: getTypeColor(index)
  }));

  // Calculate summary metrics
  const totalCampaigns = sortedCampaignTypeMetrics.reduce((sum, type) => sum + type.totalCampaigns, 0);
  const totalCost = sortedCampaignTypeMetrics.reduce((sum, type) => sum + type.totalCost, 0);
  const totalROI = sortedCampaignTypeMetrics.reduce((sum, type) => sum + type.averageROI, 0) / sortedCampaignTypeMetrics.length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Campaign Types</p>
                <p className="text-2xl font-bold text-blue-600">{sortedCampaignTypeMetrics.length}</p>
              </div>
              <Trophy className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
                <p className="text-2xl font-bold text-indigo-600">{totalCampaigns}</p>
              </div>
              <Users className="h-8 w-8 text-indigo-600" />
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
                  {formatCurrency(sortedCampaignTypeMetrics.reduce((sum, type) => sum + type.totalPipelineValue, 0))}
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
                  <TableHead className="text-right">Open Opps</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                  <TableHead className="text-right">Win Rate</TableHead>
                  <TableHead className="text-right">Customers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCampaignTypeMetrics.map((typeMetrics, index) => (
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
                    <TableCell className="text-center">{typeMetrics.totalCampaigns}</TableCell>
                    <TableCell className="text-right">{formatCurrency(typeMetrics.totalCost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(typeMetrics.totalPipelineValue)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(typeMetrics.totalClosedWonValue)}</TableCell>
                    <TableCell className="text-right">{typeMetrics.totalOpenOpportunities || 0}</TableCell>
                    <TableCell className={`text-right font-bold ${getROIColor(typeMetrics.averageROI)}`}>
                      {formatPercentage(typeMetrics.averageROI)}
                    </TableCell>
                    <TableCell className="text-right">{formatPercentage(typeMetrics.averageWinRate)}</TableCell>
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
            Strategic Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">Best Performing Type</h4>
                <p className="text-sm text-green-700">
                  <strong>{sortedCampaignTypeMetrics[0]?.campaignType}</strong> leads with{' '}
                  {formatPercentage(sortedCampaignTypeMetrics[0]?.averageROI || 0)} ROI
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Highest Volume</h4>
                <p className="text-sm text-blue-700">
                  <strong>
                    {[...sortedCampaignTypeMetrics].sort((a, b) => b.totalCustomers - a.totalCustomers)[0]?.campaignType}
                  </strong>{' '}
                  has the most customers with{' '}
                  {[...sortedCampaignTypeMetrics].sort((a, b) => b.totalCustomers - a.totalCustomers)[0]?.totalCustomers.toLocaleString()}
                </p>
              </div>
            </div>
            
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">Optimization Opportunity</h4>
              <p className="text-sm text-yellow-700">
                Consider reallocating budget from lower-performing campaign types to{' '}
                <strong>{sortedCampaignTypeMetrics[0]?.campaignType}</strong> for maximum ROI impact.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CampaignTypeAnalysis;