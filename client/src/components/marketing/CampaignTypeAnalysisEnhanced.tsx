import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CampaignTypeROIBarchart from '../analytics-comparison/CampaignTypeROIBarchart';
import CampaignTypePerformanceTable from '../analytics-comparison/CampaignTypePerformanceTable';

import useCampaignTypeData from '../analytics-comparison/hooks/useCampaignTypeData';
import { TrendingUp, DollarSign, Target, Users, Trophy, BarChart3, GitBranch, Clock, Calendar } from 'lucide-react';

type AnalysisView = 'influenced' | 'new-pipeline';
type TimePeriod = 'all-time' | 'fy-to-date' | 'last-year' | 'quarter-to-date' | 'last-quarter';

const CampaignTypeAnalysisEnhanced: React.FC = () => {
  const [activeView, setActiveView] = useState<AnalysisView>('influenced');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('fy-to-date');
  
  const { 
    data, 
    metrics, 
    categorizedData, 
    reallocationAnalysis,
    isLoading, 
    error, 
    isEmpty 
  } = useCampaignTypeData('influenced', timePeriod);

  // For New Pipeline tab, we need specialized data that filters by 30-day window
  const { 
    data: newPipelineData, 
    metrics: newPipelineMetrics,
    isLoading: newPipelineLoading
  } = useCampaignTypeData(activeView === 'new-pipeline' ? 'new-pipeline' : 'influenced', timePeriod);

  // Use the appropriate data and metrics based on active view
  const currentData = activeView === 'new-pipeline' ? newPipelineData : data;
  const currentMetrics = activeView === 'new-pipeline' ? newPipelineMetrics : metrics;
  const currentLoading = activeView === 'new-pipeline' ? newPipelineLoading : isLoading;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  if (currentLoading) {
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
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
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

  if (isEmpty || !currentMetrics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No campaign type data available
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
          <h2 className="text-2xl font-bold tracking-tight">Campaign Type Performance</h2>
          <p className="text-muted-foreground">
            Comprehensive analysis of campaign effectiveness by type with budget optimization insights
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={timePeriod} onValueChange={(value) => setTimePeriod(value as TimePeriod)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-time">All Time</SelectItem>
                <SelectItem value="fy-to-date">FY to Date</SelectItem>
                <SelectItem value="last-year">Last Year</SelectItem>
                <SelectItem value="quarter-to-date">Quarter to Date</SelectItem>
                <SelectItem value="last-quarter">Last Quarter</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Badge variant="secondary" className="px-3 py-1">
            {currentData.length} Types
          </Badge>
        </div>
      </div>

      {/* Analysis View Toggle */}
      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as AnalysisView)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="influenced" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Influenced Pipeline
          </TabsTrigger>
          <TabsTrigger value="new-pipeline" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            New Pipeline (30d)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="influenced" className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(currentMetrics.totalInvestment)}</div>
                <p className="text-xs text-muted-foreground">
                  Across {currentMetrics.totalCampaigns} campaigns
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pipeline</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(currentMetrics.totalPipeline)}</div>
                <p className="text-xs text-muted-foreground">
                  {currentMetrics.totalCustomers} opportunities influenced
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Closed Won</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(currentMetrics.totalClosedWon)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentMetrics.closedWonCustomers} customers closed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Pipeline</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(currentMetrics.openPipeline)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentMetrics.openPipelineCustomers} customers open
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div 
                  className="text-2xl font-bold text-blue-600 cursor-help" 
                  title={`Win Rate Calculation: ${currentMetrics.closedWonCustomers} Closed Won / (${currentMetrics.closedWonCustomers} Closed Won + ${currentMetrics.closedLostCustomers} Closed Lost) = ${formatPercentage(currentMetrics.averageWinRate)}`}
                >
                  {formatPercentage(currentMetrics.averageWinRate)}
                </div>
                <p 
                  className="text-xs text-gray-500 mt-1 cursor-help"
                  title={`Close Rate Calculation: ${currentMetrics.closedWonCustomers} Closed Won / (${currentMetrics.closedWonCustomers} Closed Won + ${currentMetrics.closedLostCustomers} Closed Lost + ${currentMetrics.openPipelineCustomers} Open Pipeline) = ${formatPercentage(currentMetrics.averageCloseRate)}`}
                >
                  Close Rate: {formatPercentage(currentMetrics.averageCloseRate)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ROI Bar Chart */}
          <CampaignTypeROIBarchart data={currentData} />

          {/* Performance Table */}
          <CampaignTypePerformanceTable data={currentData} analysisType="influenced" />


        </TabsContent>

        <TabsContent value="new-pipeline" className="space-y-6">
          {/* New Pipeline Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.reduce((sum, ct: any) => sum + ct.totalCost, 0))}</div>
                <p className="text-xs text-muted-foreground">
                  Across {data.length} campaign types
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pipeline</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(currentMetrics.totalPipeline)}</div>
                <p className="text-xs text-muted-foreground">
                  {currentMetrics.totalCustomers} opportunities influenced
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Closed Won</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(currentMetrics.totalClosedWon)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentMetrics.closedWonCustomers} customers closed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Pipeline</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(currentMetrics.openPipeline)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentMetrics.openPipelineCustomers} customers open
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div 
                  className="text-2xl font-bold text-blue-600 cursor-help" 
                  title={`Win Rate Calculation: ${currentMetrics.closedWonCustomers} Closed Won / (${currentMetrics.closedWonCustomers} Closed Won + ${currentMetrics.closedLostCustomers} Closed Lost) = ${formatPercentage(currentMetrics.averageWinRate)}`}
                >
                  {formatPercentage(currentMetrics.averageWinRate)}
                </div>
                <p 
                  className="text-xs text-gray-500 mt-1 cursor-help"
                  title={`Close Rate Calculation: ${currentMetrics.closedWonCustomers} Closed Won / (${currentMetrics.closedWonCustomers} Closed Won + ${currentMetrics.closedLostCustomers} Closed Lost + ${currentMetrics.openPipelineCustomers} Open Pipeline) = ${formatPercentage(currentMetrics.averageCloseRate)}`}
                >
                  Close Rate: {formatPercentage(currentMetrics.averageCloseRate)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* New Pipeline ROI Chart */}
          <CampaignTypeROIBarchart data={currentData} />

          {/* New Pipeline Performance Table */}
          <CampaignTypePerformanceTable data={currentData} analysisType="new-pipeline" />
        </TabsContent>


      </Tabs>
    </div>
  );
};

export default CampaignTypeAnalysisEnhanced;