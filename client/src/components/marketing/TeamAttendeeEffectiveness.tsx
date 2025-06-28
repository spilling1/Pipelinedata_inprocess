import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, TrendingUp, DollarSign, Target } from 'lucide-react';

interface TeamAttendeePerformance {
  attendeeName: string;
  role: string;
  campaignsAttended: number;
  totalOpportunities: number;
  totalPipelineValue: number;
  closedWonDeals: number;
  closedWonValue: number;
  winRate: number;
  averageDealSize: number;
  pipelinePerCampaign: number;
  closeRate: number;
  campaignTypes: string[];
}

interface TeamAttendeeEffectivenessData {
  attendeePerformance: TeamAttendeePerformance[];
  roleAnalysis: {
    role: string;
    averagePipelineValue: number;
    averageWinRate: number;
    totalAttendees: number;
    topPerformer: string;
  }[];
  insights: {
    topPipelineCreator: TeamAttendeePerformance;
    topCloser: TeamAttendeePerformance;
    mostVersatile: TeamAttendeePerformance;
  };
}

const TeamAttendeeEffectiveness: React.FC = () => {
  const { data, isLoading, error } = useQuery<TeamAttendeeEffectivenessData>({
    queryKey: ['/api/marketing/comparative/team-attendee-effectiveness'],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Attendee Effectiveness
            </CardTitle>
            <CardDescription>
              Individual performance analytics across campaigns
            </CardDescription>
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
          <CardTitle className="text-red-600">Error Loading Team Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Unable to load team attendee effectiveness data. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  const formatPercentage = (value: number) => {
    return `${Math.min(value, 100).toFixed(1)}%`;
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'sales':
        return 'bg-blue-100 text-blue-800';
      case 'marketing':
        return 'bg-green-100 text-green-800';
      case 'engineering':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Insights */}
      {data?.insights && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Top Pipeline Creator</p>
                  <p className="text-lg font-bold">{data.insights.topPipelineCreator.attendeeName}</p>
                  <p className="text-sm text-gray-500">
                    {formatCurrency(data.insights.topPipelineCreator.totalPipelineValue)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Top Closer</p>
                  <p className="text-lg font-bold">{data.insights.topCloser.attendeeName}</p>
                  <p className="text-sm text-gray-500">
                    {formatPercentage(data.insights.topCloser.winRate)} win rate
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
                  <p className="text-sm font-medium text-gray-600">Most Versatile</p>
                  <p className="text-lg font-bold">{data.insights.mostVersatile.attendeeName}</p>
                  <p className="text-sm text-gray-500">
                    {data.insights.mostVersatile.campaignTypes.length} campaign types
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Individual Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Individual Team Member Performance
          </CardTitle>
          <CardDescription>
            Performance metrics for each team member across campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data?.attendeePerformance.map((attendee, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{attendee.attendeeName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getRoleBadgeColor(attendee.role)}>
                        {attendee.role}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {attendee.campaignsAttended} campaigns attended
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-blue-600">
                      {formatCurrency(attendee.totalPipelineValue)}
                    </p>
                    <p className="text-sm text-gray-600">Total Pipeline</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Opportunities</p>
                    <p className="text-lg font-semibold">{attendee.totalOpportunities}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Closed Won</p>
                    <p className="text-lg font-semibold">{attendee.closedWonDeals}</p>
                    <p className="text-xs text-gray-500">
                      {formatCurrency(attendee.closedWonValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Win Rate</p>
                    <p className="text-lg font-semibold">
                      {formatPercentage(attendee.winRate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Deal Size</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(attendee.averageDealSize)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm font-medium text-gray-600 mb-2">Campaign Types:</p>
                  <div className="flex flex-wrap gap-1">
                    {attendee.campaignTypes.map((type, typeIndex) => (
                      <Badge key={typeIndex} variant="outline" className="text-xs">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Role Analysis */}
      {data?.roleAnalysis && data.roleAnalysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Performance by Role
            </CardTitle>
            <CardDescription>
              Comparative analysis across different team roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.roleAnalysis.map((role, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className={getRoleBadgeColor(role.role)} variant="secondary">
                      {role.role}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {role.totalAttendees} members
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg Pipeline</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(role.averagePipelineValue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg Win Rate</p>
                      <p className="text-lg font-semibold">
                        {formatPercentage(role.averageWinRate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Top Performer</p>
                      <p className="text-sm font-semibold text-blue-600">
                        {role.topPerformer}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeamAttendeeEffectiveness;