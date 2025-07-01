import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, Target, Users, Lightbulb, TrendingUp } from 'lucide-react';

interface StrategicMatrixData {
  matrix: Array<{
    attendeeRange: string;
    targetAccounts: {
      customerCount: number;
      winRate: number;
      averageDealSize: number;
      roi: number;
    };
    nonTargetAccounts: {
      customerCount: number;
      winRate: number;
      averageDealSize: number;
      roi: number;
    };
  }>;
  recommendations: Array<{
    accountType: 'target' | 'non-target';
    optimalAttendeeRange: string;
    reasoning: string;
    expectedROI: number;
  }>;
}

const StrategicEngagementMatrix: React.FC = () => {
  const { data, isLoading, error } = useQuery<StrategicMatrixData>({
    queryKey: ['/api/marketing/comparative/strategic-matrix'],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Strategic Engagement Matrix</CardTitle>
            <CardDescription>Loading strategic recommendations...</CardDescription>
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
          <CardTitle className="text-red-600">Error Loading Strategic Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Unable to load strategic engagement matrix. Please try again later.
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

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const getROIColor = (roi: number) => {
    if (roi >= 500) return 'text-green-600 bg-green-50';
    if (roi >= 300) return 'text-blue-600 bg-blue-50';
    if (roi >= 200) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getAccountTypeBadge = (type: 'target' | 'non-target') => {
    return type === 'target' 
      ? 'bg-blue-100 text-blue-800' 
      : 'bg-gray-100 text-gray-800';
  };

  // Find optimal strategies
  const bestTargetStrategy = data?.recommendations.find(r => r.accountType === 'target');
  const bestNonTargetStrategy = data?.recommendations.find(r => r.accountType === 'non-target');

  return (
    <div className="space-y-6">
      {/* Strategic Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {bestTargetStrategy && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Optimal Target Account Strategy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Recommended Attendee Range</span>
                  <Badge className="bg-blue-100 text-blue-800">
                    {bestTargetStrategy.optimalAttendeeRange} attendees
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Expected ROI</span>
                  <span className="text-lg font-bold text-green-600">
                    {formatPercentage(bestTargetStrategy.expectedROI)}
                  </span>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700">
                    {bestTargetStrategy.reasoning}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {bestNonTargetStrategy && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-600" />
                Optimal Non-Target Strategy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Recommended Attendee Range</span>
                  <Badge className="bg-gray-100 text-gray-800">
                    {bestNonTargetStrategy.optimalAttendeeRange} attendees
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Expected ROI</span>
                  <span className="text-lg font-bold text-green-600">
                    {formatPercentage(bestNonTargetStrategy.expectedROI)}
                  </span>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-700">
                    {bestNonTargetStrategy.reasoning}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Engagement Matrix Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Strategic Engagement Matrix
          </CardTitle>
          <CardDescription>
            Performance comparison across attendee ranges and account types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Attendee Range</TableHead>
                <TableHead>Account Type</TableHead>
                <TableHead className="text-right">Customer Count</TableHead>
                <TableHead className="text-right">Win Rate</TableHead>
                <TableHead className="text-right">Avg Deal Size</TableHead>
                <TableHead className="text-right">ROI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.matrix.map((range, index) => [
                <TableRow key={`target-${index}`}>
                  <TableCell className="font-medium">{range.attendeeRange}</TableCell>
                  <TableCell>
                    <Badge className="bg-blue-100 text-blue-800">Target</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {range.targetAccounts.customerCount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPercentage(range.targetAccounts.winRate)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(range.targetAccounts.averageDealSize)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`px-2 py-1 rounded-full text-sm font-medium ${getROIColor(range.targetAccounts.roi)}`}>
                      {formatPercentage(range.targetAccounts.roi)}
                    </span>
                  </TableCell>
                </TableRow>,
                
                <TableRow key={`non-target-${index}`}>
                  <TableCell></TableCell>
                  <TableCell>
                    <Badge className="bg-gray-100 text-gray-800">Non-Target</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {range.nonTargetAccounts.customerCount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPercentage(range.nonTargetAccounts.winRate)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(range.nonTargetAccounts.averageDealSize)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`px-2 py-1 rounded-full text-sm font-medium ${getROIColor(range.nonTargetAccounts.roi)}`}>
                      {formatPercentage(range.nonTargetAccounts.roi)}
                    </span>
                  </TableCell>
                </TableRow>
              ]).flat()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Strategic Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Strategic Investment Guidance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Target Account Insights */}
              <div className="space-y-3">
                <h4 className="font-semibold text-blue-800">Target Account Strategy</h4>
                {data?.matrix.map((range, index) => {
                  const targetROI = range.targetAccounts.roi;
                  const isOptimal = range.attendeeRange === bestTargetStrategy?.optimalAttendeeRange;
                  
                  return (
                    <div key={`target-${index}`} className={`p-3 rounded-lg border ${isOptimal ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{range.attendeeRange} attendees</span>
                        <div className="flex items-center gap-2">
                          {isOptimal && <Badge className="bg-blue-100 text-blue-800">Optimal</Badge>}
                          <span className="font-bold">{formatPercentage(targetROI)}</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {range.targetAccounts.customerCount} customers, {formatPercentage(range.targetAccounts.winRate)} win rate
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Non-Target Account Insights */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800">Non-Target Account Strategy</h4>
                {data?.matrix.map((range, index) => {
                  const nonTargetROI = range.nonTargetAccounts.roi;
                  const isOptimal = range.attendeeRange === bestNonTargetStrategy?.optimalAttendeeRange;
                  
                  return (
                    <div key={`non-target-${index}`} className={`p-3 rounded-lg border ${isOptimal ? 'border-gray-400 bg-gray-50' : 'border-gray-200'}`}>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{range.attendeeRange} attendees</span>
                        <div className="flex items-center gap-2">
                          {isOptimal && <Badge className="bg-gray-100 text-gray-800">Optimal</Badge>}
                          <span className="font-bold">{formatPercentage(nonTargetROI)}</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {range.nonTargetAccounts.customerCount} customers, {formatPercentage(range.nonTargetAccounts.winRate)} win rate
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Overall Strategic Recommendations */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Key Strategic Insights
              </h4>
              <ul className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>
                    Optimal attendee allocation: <strong>{bestTargetStrategy?.optimalAttendeeRange}</strong> for target accounts, 
                    <strong> {bestNonTargetStrategy?.optimalAttendeeRange}</strong> for non-target accounts
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>
                    Expected ROI difference: {bestTargetStrategy && bestNonTargetStrategy && 
                    `${formatPercentage(bestTargetStrategy.expectedROI - bestNonTargetStrategy.expectedROI)} higher ROI for target accounts`}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>
                    Resource allocation recommendation: Prioritize target account engagement with optimal attendee investment for maximum ROI
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>
                    Campaign efficiency: Use strategic engagement matrix to optimize attendee deployment across account segments
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StrategicEngagementMatrix;