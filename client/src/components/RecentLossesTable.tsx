import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface RecentLoss {
  opportunityName: string;
  clientName?: string;
  lossReason: string;
  year1Value: number;
  closeDate: string;
  previousStage: string;
}

export default function RecentLossesTable() {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  
  const { data: losses, isLoading } = useQuery<RecentLoss[]>({
    queryKey: ['/api/recent-losses'],
  });



  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount || isNaN(amount)) {
      return '$0';
    }
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    } else {
      return `$${amount.toLocaleString()}`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getLossReasonColor = (reason: string) => {
    switch (reason.toLowerCase()) {
      case 'bad timing':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'no decision / non-responsive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case "don't see value":
        return 'bg-red-100 text-red-800 border-red-200';
      case 'no budget / lost funding':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'lost to competitor':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'stakeholders not engaged':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  // Sort losses by close date descending
  const sortedLosses = losses?.sort((a, b) => 
    new Date(b.closeDate).getTime() - new Date(a.closeDate).getTime()
  ) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Losses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!losses || losses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Losses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>No recent losses found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Recent Losses</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {sortedLosses.slice(0, 10).map((loss, index) => {
            const isExpanded = expandedItems.has(index);
            
            return (
              <div key={index} className="border border-gray-200 rounded-lg">
                {/* Main Row */}
                <div 
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleExpanded(index)}
                >
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    {isExpanded ? 
                      <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" /> : 
                      <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    }
                    <div className="font-medium text-sm text-gray-900 truncate" title={loss.opportunityName}>
                      {loss.opportunityName}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900 ml-2">
                    {formatCurrency(loss.year1Value)}
                  </div>
                </div>
                
                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-0 border-t border-gray-100 bg-gray-50">
                    <div className="space-y-2 text-xs">
                      {loss.clientName && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Client:</span>
                          <span className="font-medium">{loss.clientName}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Loss Reason:</span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getLossReasonColor(loss.lossReason)}`}
                        >
                          {loss.lossReason}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Previous Stage:</span>
                        <span className="font-medium">{loss.previousStage}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Close Date:</span>
                        <span className="font-medium">{formatDate(loss.closeDate)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}