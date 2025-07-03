import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CampaignTypeROIBarchart from '../analytics-comparison/CampaignTypeROIBarchart';
import CampaignTypePerformanceTable from '../analytics-comparison/CampaignTypePerformanceTable';

import useCampaignTypeData from '../analytics-comparison/hooks/useCampaignTypeData';
import { TrendingUp, DollarSign, Target, Users, Trophy, BarChart3, GitBranch, Clock, Activity, Calendar } from 'lucide-react';

type AnalysisView = 'influenced' | 'new-pipeline' | 'stage-advance';
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
  } = useCampaignTypeData(activeView, timePeriod);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

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

  if (isEmpty || !metrics) {
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
            {data.length} Types
          </Badge>
        </div>
      </div>

      {/* Analysis View Toggle */}
      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as AnalysisView)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="influenced" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Influenced Pipeline
          </TabsTrigger>
          <TabsTrigger value="new-pipeline" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            New Pipeline (30d)
          </TabsTrigger>
          <TabsTrigger value="stage-advance" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Stage Advance (30d)
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
                <div className="text-2xl font-bold">{formatCurrency(metrics.totalInvestment)}</div>
                <p className="text-xs text-muted-foreground">
                  Across {metrics.totalCampaigns} campaigns
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pipeline</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(metrics.totalPipeline)}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.totalCustomers} customers engaged
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
                  {formatCurrency(metrics.totalClosedWon)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics.closedWonCustomers} customers closed
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
                  {formatCurrency(metrics.openPipeline)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics.openPipelineCustomers} customers open
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
                  title={`Win Rate Calculation: ${metrics.closedWonCustomers} Closed Won / (${metrics.closedWonCustomers} Closed Won + ${metrics.closedLostCustomers} Closed Lost) = ${formatPercentage(metrics.averageWinRate)}`}
                >
                  {formatPercentage(metrics.averageWinRate)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Closed Won / (Closed Won + Closed Lost)
                </p>
                <p 
                  className="text-xs text-gray-500 mt-1 cursor-help"
                  title={`Close Rate Calculation: ${metrics.closedWonCustomers} Closed Won / (${metrics.closedWonCustomers} Closed Won + ${metrics.openPipelineCustomers} Open Pipeline) = ${formatPercentage(metrics.averageCloseRate)}`}
                >
                  Close Rate: {formatPercentage(metrics.averageCloseRate)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ROI Bar Chart */}
          <CampaignTypeROIBarchart data={data} />

          {/* Performance Table */}
          <CampaignTypePerformanceTable data={data} />


        </TabsContent>

        <TabsContent value="new-pipeline" className="space-y-6">
          {/* New Pipeline Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Opportunities</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.reduce((sum, ct: any) => sum + (ct.newOpportunityCount || 0), 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Within 30 days of campaigns
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Pipeline Value</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.reduce((sum, ct: any) => sum + (ct.totalNewPipelineValue || 0), 0))}
                </div>
                <p className="text-xs text-muted-foreground">
                  From new opportunities
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Closed Won</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(data.reduce((sum, ct: any) => sum + (ct.closedWonFromNew || 0), 0))}
                </div>
                <p className="text-xs text-muted-foreground">
                  From new pipeline
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Efficiency</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {data.length > 0 ? formatCurrency(data.reduce((sum, ct: any) => sum + (ct.newPipelineEfficiency || 0), 0) / data.length) : '$0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  New pipeline per $ spent
                </p>
              </CardContent>
            </Card>
          </div>

          {/* New Pipeline ROI Chart */}
          <CampaignTypeROIBarchart data={data} />

          {/* New Pipeline Performance Table */}
          <CampaignTypePerformanceTable data={data} />
        </TabsContent>

        <TabsContent value="stage-advance" className="space-y-6">
          {/* Stage Advance Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Positive Movements</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.reduce((sum, ct: any) => sum + (ct.positiveMovements || 0), 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Stage advancements within 30d
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Advanced Pipeline</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.reduce((sum, ct: any) => sum + (ct.totalAdvancedPipelineValue || 0), 0))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Value that moved forward
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Closed Won</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(data.reduce((sum, ct: any) => sum + (ct.closedWonFromAdvancement || 0), 0))}
                </div>
                <p className="text-xs text-muted-foreground">
                  From stage advancement
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Advancement Efficiency</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {data.length > 0 ? formatCurrency(data.reduce((sum, ct: any) => sum + (ct.stageAdvancementEfficiency || 0), 0) / data.length) : '$0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Advanced pipeline per $ spent
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Stage Advance ROI Chart */}
          <CampaignTypeROIBarchart data={data} />

          {/* Stage Advance Performance Table */}
          <CampaignTypePerformanceTable data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CampaignTypeAnalysisEnhanced;