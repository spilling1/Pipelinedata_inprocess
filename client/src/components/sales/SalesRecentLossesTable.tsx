import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Calendar } from "lucide-react";
import { SalesFilterState } from "@/types/sales";

interface SalesRecentLossesTableProps {
  filters: SalesFilterState;
}

export default function SalesRecentLossesTable({ filters }: SalesRecentLossesTableProps) {
  // Build query parameters
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value && (Array.isArray(value) ? value.length > 0 : true)) {
      if (Array.isArray(value)) {
        queryParams.append(key, value.join(','));
      } else {
        queryParams.append(key, value.toString());
      }
    }
  });

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['/api/sales/recent-losses', queryParams.toString()],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Recent Losses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const recentLosses = analytics?.recentLosses || [];

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value?.toFixed(0) || 0}`;
    }
  };

  const getReasonColor = (reason: string) => {
    const reasonColors: { [key: string]: string } = {
      'No Decision / Non-Responsive': 'bg-gray-100 text-gray-800',
      'Bad Timing': 'bg-yellow-100 text-yellow-800',
      'Don\'t See Value': 'bg-red-100 text-red-800',
      'Stakeholders Not Engaged': 'bg-orange-100 text-orange-800',
      'No Budget / Lost Funding': 'bg-purple-100 text-purple-800',
      'Competitor Won': 'bg-blue-100 text-blue-800',
    };
    return reasonColors[reason] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Recent Losses
          {filters.salesRep !== 'all' && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              - {filters.salesRep}
            </span>
          )}
        </CardTitle>
        <div className="text-sm text-gray-600">
          Last 30 days • {recentLosses.length} lost deals
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {recentLosses.length > 0 ? (
            recentLosses.map((loss: any, index: number) => (
              <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900 mb-1">
                      {loss.opportunityName}
                    </div>
                    <div className="text-xs text-gray-600">
                      {loss.clientName || 'Unknown Client'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-sm text-red-700">
                      {formatCurrency(loss.value)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {getDaysAgo(loss.lostDate)}d ago
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={getReasonColor(loss.lossReason)} variant="outline">
                    {loss.lossReason}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {loss.stage}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                  <div>
                    <span className="font-medium">Owner:</span> {loss.owner || 'Unassigned'}
                  </div>
                  <div>
                    <span className="font-medium">Lost:</span> {formatDate(loss.lostDate)}
                  </div>
                </div>
                
                {loss.notes && (
                  <div className="text-xs text-gray-500 mt-2 italic">
                    "{loss.notes}"
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No recent losses</p>
              <p className="text-xs">No deals lost in the last 30 days</p>
            </div>
          )}
        </div>
        
        {recentLosses.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Total Lost Value:</span>
                <span className="ml-2 text-red-600">
                  {formatCurrency(recentLosses.reduce((sum: number, loss: any) => sum + loss.value, 0))}
                </span>
              </div>
              <div>
                <span className="font-medium">Avg Deal Size:</span>
                <span className="ml-2">
                  {formatCurrency(recentLosses.reduce((sum: number, loss: any) => sum + loss.value, 0) / recentLosses.length)}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}