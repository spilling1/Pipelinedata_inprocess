import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import TouchDistributionChart from './components/TouchDistributionChart';
import CustomerJourneyTable from './components/CustomerJourneyTable';
import CustomerJourneyInsights from './components/CustomerJourneyInsights';
import JourneyFunnel from './components/JourneyFunnel';
import { useCustomerJourneyData } from './hooks/useCustomerJourneyData';
import { Route, Users, Target, TrendingUp, BarChart3 } from 'lucide-react';

const CustomerJourneyAnalysis: React.FC = () => {
  const { data, insights, isLoading, error, metrics } = useCustomerJourneyData();

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
          <h2 className="text-2xl font-bold tracking-tight">Customer Journey Analysis</h2>
          <p className="text-muted-foreground">
            Multi-touch attribution and customer journey progression through campaign interactions
          </p>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">{metrics?.totalCustomers || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {metrics?.multiTouchPercentage?.toFixed(1) || 0}% Multi-Touch
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Touches</p>
                <p className="text-2xl font-bold">{metrics?.averageTouches?.toFixed(1) || 0}</p>
                <p className="text-xs text-muted-foreground">
                  Per Customer Journey
                </p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Journey CAC</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(metrics?.averageJourneyCAC || 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Average Cost per Customer
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
                <p className="text-sm font-medium text-muted-foreground">Journey Value</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(metrics?.totalJourneyValue || 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Total Pipeline + Closed Won
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Touch Distribution Chart */}
      <TouchDistributionChart data={data} />

      {/* Journey Flow Chart */}
      <JourneyFunnel data={data} insights={insights} />

      {/* Customer Journey Table */}
      <CustomerJourneyTable customers={data} />

      {/* Journey Insights */}
      <CustomerJourneyInsights data={data} insights={insights} metrics={metrics} />
    </div>
  );
};

export default CustomerJourneyAnalysis;