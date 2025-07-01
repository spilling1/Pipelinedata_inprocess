import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CampaignTypeROIBarchart from '../analytics-comparison/CampaignTypeROIBarchart';
import CampaignTypePerformanceTable from '../analytics-comparison/CampaignTypePerformanceTable';
import CampaignTypeInsights from '../analytics-comparison/CampaignTypeInsights';
import useCampaignTypeData from '../analytics-comparison/hooks/useCampaignTypeData';
import { TrendingUp, DollarSign, Target, Users, Trophy, BarChart3, GitBranch, Clock, Activity } from 'lucide-react';

type AnalysisView = 'influenced' | 'new-pipeline' | 'stage-advance';

const CampaignTypeAnalysisEnhanced: React.FC = () => {
  const [activeView, setActiveView] = useState<AnalysisView>('influenced');
  
  const { 
    data, 
    metrics, 
    categorizedData, 
    reallocationAnalysis,
    isLoading, 
    error, 
    isEmpty 
  } = useCampaignTypeData(activeView);

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
        <Badge variant="secondary" className="px-3 py-1">
          {data.length} Types
        </Badge>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  {formatPercentage(metrics.averageROI)} weighted ROI
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Win Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatPercentage(metrics.averageWinRate)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all campaign types
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Distribution */}
          {categorizedData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Distribution
                </CardTitle>
                <CardDescription>
                  Campaign types categorized by ROI performance levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{categorizedData.excellent.length}</div>
                    <div className="text-sm text-muted-foreground">Excellent</div>
                    <div className="text-xs text-muted-foreground">≥500% ROI</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{categorizedData.good.length}</div>
                    <div className="text-sm text-muted-foreground">Good</div>
                    <div className="text-xs text-muted-foreground">200-499% ROI</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{categorizedData.moderate.length}</div>
                    <div className="text-sm text-muted-foreground">Moderate</div>
                    <div className="text-xs text-muted-foreground">100-199% ROI</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{categorizedData.poor.length}</div>
                    <div className="text-sm text-muted-foreground">Poor</div>
                    <div className="text-xs text-muted-foreground">&lt;100% ROI</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ROI Bar Chart */}
          <CampaignTypeROIBarchart data={data} />

          {/* Performance Table */}
          <CampaignTypePerformanceTable data={data} />

          {/* Strategic Insights */}
          <CampaignTypeInsights data={data} />

          {/* Budget Reallocation Alert */}
          {reallocationAnalysis && reallocationAnalysis.inefficientTypes.length > 0 && (
            <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
              <CardHeader>
                <CardTitle className="text-orange-800 dark:text-orange-200">
                  Budget Optimization Opportunity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Potential Reallocation:</strong> {formatCurrency(reallocationAnalysis.reallocationAmount)} 
                    ({reallocationAnalysis.reallocationPercentage.toFixed(1)}% of total budget)
                  </div>
                  <div>
                    <strong>From:</strong> {reallocationAnalysis.inefficientTypes.map(t => t.campaignType).join(', ')}
                  </div>
                  <div>
                    <strong>To:</strong> {reallocationAnalysis.recommendedTarget}
                  </div>
                  <div>
                    <strong>Potential Additional Return:</strong> {formatCurrency(reallocationAnalysis.potentialGain)}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
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