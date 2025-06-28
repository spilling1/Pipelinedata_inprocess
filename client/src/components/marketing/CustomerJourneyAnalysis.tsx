import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Target, DollarSign, Activity, Layers, TrendingUp } from 'lucide-react';

interface CustomerJourneyData {
  customerName: string;
  opportunityId: number;
  totalTouches: number;
  campaigns: Array<{
    campaignId: number;
    campaignName: string;
    campaignType: string;
    cost: number;
    startDate: string;
  }>;
  totalCAC: number;
  currentStage: string;
  pipelineValue: number;
  closedWonValue: number;
  isClosedWon: boolean;
  isClosedLost: boolean;
  firstTouchDate: string;
  lastTouchDate: string;
}

interface TouchDistributionSummary {
  averageTouchesPerCustomer: number;
  totalCustomersWithMultipleTouches: number;
  totalUniqueCustomers: number;
  touchDistribution: Array<{
    touches: number;
    customerCount: number;
    percentage: number;
  }>;
}

const CustomerJourneyAnalysis: React.FC = () => {
  const { data: customerJourneyData, isLoading, error } = useQuery<{
    customers: CustomerJourneyData[];
    summary: TouchDistributionSummary;
  }>({
    queryKey: ['/api/marketing/comparative/customer-journey'],
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
            Error loading customer journey analysis data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!customerJourneyData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            No customer journey data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const { customers, summary } = customerJourneyData;

  // Helper functions
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStageColor = (stage: string) => {
    if (stage.includes('Closed Won')) return 'text-green-600 bg-green-50';
    if (stage.includes('Closed Lost')) return 'text-red-600 bg-red-50';
    if (stage.includes('Validation') || stage.includes('Introduction')) return 'text-gray-600 bg-gray-50';
    return 'text-blue-600 bg-blue-50';
  };

  const getTouchColor = (touches: number) => {
    if (touches >= 4) return '#8884d8';
    if (touches === 3) return '#82ca9d';
    if (touches === 2) return '#ffc658';
    return '#ff7c7c';
  };

  // Sort customers by total touches (descending) then by total CAC
  const sortedCustomers = [...customers].sort((a, b) => {
    if (b.totalTouches !== a.totalTouches) {
      return b.totalTouches - a.totalTouches;
    }
    return b.totalCAC - a.totalCAC;
  });

  // Prepare chart data for touch distribution
  const touchDistributionChartData = summary.touchDistribution.map(item => ({
    touches: `${item.touches} touch${item.touches > 1 ? 'es' : ''}`,
    count: item.customerCount,
    percentage: item.percentage,
    fill: getTouchColor(item.touches)
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Touches per Customer</p>
                <p className="text-2xl font-bold text-blue-600">
                  {summary.averageTouchesPerCustomer.toFixed(1)}
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Multi-Touch Customers</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {summary.totalCustomersWithMultipleTouches}
                </p>
                <p className="text-xs text-gray-500">
                  {((summary.totalCustomersWithMultipleTouches / summary.totalUniqueCustomers) * 100).toFixed(1)}% of total
                </p>
              </div>
              <Layers className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold text-green-600">{summary.totalUniqueCustomers}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Multi-Touch CAC</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(customers.filter(c => c.totalTouches > 1).reduce((sum, c) => sum + c.totalCAC, 0))}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Touch Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Touch Distribution
            </CardTitle>
            <CardDescription>
              Number of campaigns touching each customer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={touchDistributionChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="touches" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      `${value} customers`,
                      'Count'
                    ]}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {touchDistributionChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Touch Percentage Distribution
            </CardTitle>
            <CardDescription>
              Percentage breakdown of customer touch patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={touchDistributionChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    dataKey="percentage"
                    label={({ touches, percentage }) => `${touches}: ${percentage.toFixed(1)}%`}
                  >
                    {touchDistributionChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value.toFixed(1)}%`, 'Percentage']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Customer Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Customer Journey Details
          </CardTitle>
          <CardDescription>
            Complete customer attribution with campaign touches and cumulative CAC
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-center">Touches</TableHead>
                  <TableHead className="text-right">Total CAC</TableHead>
                  <TableHead className="text-right">Pipeline Value</TableHead>
                  <TableHead>Current Stage</TableHead>
                  <TableHead>Campaign Types</TableHead>
                  <TableHead>Journey Period</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCustomers.map((customer) => (
                  <TableRow key={customer.opportunityId}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{customer.customerName}</div>
                        <div className="text-xs text-gray-500">ID: {customer.opportunityId}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant="outline" 
                        className={`${customer.totalTouches > 1 ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'}`}
                      >
                        {customer.totalTouches}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(customer.totalCAC)}
                    </TableCell>
                    <TableCell className="text-right">
                      {customer.isClosedWon 
                        ? formatCurrency(customer.closedWonValue)
                        : formatCurrency(customer.pipelineValue)
                      }
                    </TableCell>
                    <TableCell>
                      <Badge className={getStageColor(customer.currentStage)}>
                        {customer.currentStage}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {[...new Set(customer.campaigns.map(c => c.campaignType))].map((type, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>
                        <div className="font-medium">First: {formatDate(customer.firstTouchDate)}</div>
                        <div className="text-gray-500">Last: {formatDate(customer.lastTouchDate)}</div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Multi-Touch Attribution Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Multi-Touch Impact</h4>
                <p className="text-sm text-blue-700">
                  {summary.totalCustomersWithMultipleTouches} customers ({((summary.totalCustomersWithMultipleTouches / summary.totalUniqueCustomers) * 100).toFixed(1)}%) 
                  have been touched by multiple campaigns, indicating significant campaign overlap and attribution complexity.
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">Average Journey Length</h4>
                <p className="text-sm text-green-700">
                  On average, each customer is touched by {summary.averageTouchesPerCustomer.toFixed(1)} campaigns, 
                  suggesting effective multi-channel engagement strategies.
                </p>
              </div>
            </div>
            
            {summary.touchDistribution.length > 0 && (
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-semibold text-yellow-800 mb-2">Touch Pattern Analysis</h4>
                <p className="text-sm text-yellow-700">
                  Most common pattern: <strong>{summary.touchDistribution[0]?.touches} touch{summary.touchDistribution[0]?.touches > 1 ? 'es' : ''}</strong> 
                  affecting {summary.touchDistribution[0]?.customerCount} customers ({summary.touchDistribution[0]?.percentage.toFixed(1)}%). 
                  Consider analyzing the effectiveness of single vs. multi-touch journeys for CAC optimization.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerJourneyAnalysis;