import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCustomerJourneyData } from './hooks/useCustomerJourneyData';
import { Users, Route, Target, TrendingUp } from 'lucide-react';

const CustomerJourneyAnalysisSimple: React.FC = () => {
  const { data, summary, isLoading, error } = useCustomerJourneyData();

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
            Error loading customer journey analysis data: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No customer journey data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Customer Journey Analysis</h2>
          <p className="text-muted-foreground">
            Multi-touch attribution and customer journey progression through campaign interactions
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{summary?.totalUniqueCustomers || data.length}</div>
                <div className="text-sm text-muted-foreground">Total Customers</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{summary?.averageTouchesPerCustomer?.toFixed(1) || '0.0'}</div>
                <div className="text-sm text-muted-foreground">Avg Touches/Customer</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{summary?.totalCustomersWithMultipleTouches || 0}</div>
                <div className="text-sm text-muted-foreground">Multi-Touch Customers</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{((summary?.totalCustomersWithMultipleTouches || 0) / (summary?.totalUniqueCustomers || 1) * 100).toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Multi-Touch Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Touch Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Touch Point Distribution</CardTitle>
          <CardDescription>
            Distribution of customers by number of campaign touches
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {summary?.touchDistribution?.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                    {item.touches}
                  </div>
                  <div>
                    <div className="font-medium">{item.touches} Touch{item.touches !== 1 ? 'es' : ''}</div>
                    <div className="text-sm text-muted-foreground">{item.customerCount} customers</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{item.percentage.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">of total</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Customer Journey Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Journey Details</CardTitle>
          <CardDescription>
            Detailed view of each customer's journey through campaigns (showing first 20)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Customer</th>
                  <th className="text-left p-2">Touches</th>
                  <th className="text-left p-2">Current Stage</th>
                  <th className="text-left p-2">Pipeline Value</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 20).map((customer, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{customer.customerName}</td>
                    <td className="p-2">{customer.totalTouches}</td>
                    <td className="p-2">{customer.currentStage}</td>
                    <td className="p-2">${(customer.pipelineValue || 0).toLocaleString()}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        customer.isClosedWon ? 'bg-green-100 text-green-800' :
                        customer.currentStage === 'Closed Lost' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {customer.isClosedWon ? 'Closed Won' : 
                         customer.currentStage === 'Closed Lost' ? 'Closed Lost' : 'Pipeline'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length > 20 && (
              <div className="text-center text-sm text-muted-foreground mt-4">
                Showing 20 of {data.length} customers
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerJourneyAnalysisSimple;