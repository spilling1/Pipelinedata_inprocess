import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Target, Users, DollarSign } from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function CampaignTypeAggregates() {
  const { data: aggregates, isLoading } = useQuery({
    queryKey: ['/api/marketing/analytics/campaign-type-aggregates'],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Type Insights</CardTitle>
            <CardDescription>Performance analysis by campaign type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!aggregates || aggregates.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Target className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No campaign data available</h3>
          <p className="text-gray-500 text-center max-w-sm">
            Create some campaigns and associate customers to see performance insights by campaign type.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalPipelineValue = aggregates.reduce((sum: number, agg: any) => sum + agg.totalPipelineValue, 0);
  const totalOpportunities = aggregates.reduce((sum: number, agg: any) => sum + agg.totalOpportunities, 0);
  const totalCampaigns = aggregates.reduce((sum: number, agg: any) => sum + agg.campaignCount, 0);

  // Prepare data for charts
  const chartData = aggregates.map((agg: any) => ({
    type: agg.type,
    campaigns: agg.campaignCount,
    opportunities: agg.totalOpportunities,
    pipelineValue: agg.totalPipelineValue,
    winRate: agg.avgWinRate,
    cac: agg.avgCac,
  }));

  const pieData = aggregates.map((agg: any) => ({
    name: agg.type,
    value: agg.totalPipelineValue,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Campaign Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregates.length}</div>
            <p className="text-xs text-muted-foreground">
              Different types active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              Across all types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOpportunities}</div>
            <p className="text-xs text-muted-foreground">
              Associated with campaigns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Pipeline Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalPipelineValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Year 1 ARR from campaigns
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Type Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by Campaign Type</CardTitle>
          <CardDescription>
            Detailed breakdown of each campaign type's performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {aggregates.map((agg: any, index: number) => (
              <div key={agg.type} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <h3 className="text-lg font-semibold">{agg.type}</h3>
                    <Badge variant="secondary">{agg.campaignCount} campaigns</Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Avg Win Rate</div>
                    <div className="text-lg font-semibold">{agg.avgWinRate}%</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="flex items-center text-sm text-muted-foreground mb-1">
                      <Users className="h-3 w-3 mr-1" />
                      Opportunities
                    </div>
                    <div className="font-medium">{agg.totalOpportunities}</div>
                  </div>
                  
                  <div>
                    <div className="flex items-center text-sm text-muted-foreground mb-1">
                      <DollarSign className="h-3 w-3 mr-1" />
                      Pipeline Value
                    </div>
                    <div className="font-medium">${agg.totalPipelineValue.toLocaleString()}</div>
                  </div>
                  
                  <div>
                    <div className="flex items-center text-sm text-muted-foreground mb-1">
                      <Target className="h-3 w-3 mr-1" />
                      Avg CAC
                    </div>
                    <div className="font-medium">
                      {agg.avgCac > 0 ? `$${agg.avgCac.toLocaleString()}` : 'N/A'}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center text-sm text-muted-foreground mb-1">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Market Share
                    </div>
                    <div className="font-medium">
                      {totalPipelineValue > 0 
                        ? Math.round((agg.totalPipelineValue / totalPipelineValue) * 100)
                        : 0
                      }%
                    </div>
                  </div>
                </div>

                {/* Win Rate Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Win Rate Performance</span>
                    <span>{agg.avgWinRate}%</span>
                  </div>
                  <Progress value={agg.avgWinRate} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Opportunities by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Opportunities by Campaign Type</CardTitle>
            <CardDescription>
              Number of opportunities associated with each campaign type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="opportunities" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart - Pipeline Value Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Value Distribution</CardTitle>
            <CardDescription>
              Year 1 ARR distribution across campaign types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`$${value.toLocaleString()}`, 'Pipeline Value']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Win Rate Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Win Rate Comparison</CardTitle>
          <CardDescription>
            Average win rates across different campaign types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip formatter={(value: any) => [`${value}%`, 'Win Rate']} />
              <Bar dataKey="winRate" fill="#00C49F" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}