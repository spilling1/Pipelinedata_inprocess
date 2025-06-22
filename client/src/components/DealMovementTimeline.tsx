import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Plus, TrendingUp } from "lucide-react";

export default function DealMovementTimeline() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['/api/analytics'],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Deal Movements</CardTitle>
            <div className="w-20 h-6 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const movements = analytics?.recentMovements || [];

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const movementDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - movementDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getMovementIcon = (from: string, to: string) => {
    // Define stage progression order
    const stageOrder = [
      'Validation/Introduction',
      'Discover',
      'Developing Champions',
      'ROI Analysis/Pricing',
      'Negotiation/Review'
    ];
    const fromIndex = stageOrder.indexOf(from);
    const toIndex = stageOrder.indexOf(to);
    
    if (toIndex > fromIndex) {
      return { icon: ArrowRight, bgColor: 'bg-green-100', iconColor: 'text-green-600' };
    } else if (from === 'Unknown' || to === 'Unknown') {
      return { icon: Plus, bgColor: 'bg-blue-100', iconColor: 'text-blue-600' };
    } else {
      return { icon: TrendingUp, bgColor: 'bg-orange-100', iconColor: 'text-orange-600' };
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Deal Movements</CardTitle>
          <Button variant="ghost" size="sm" className="text-primary">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {movements.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg font-medium mb-2">No recent movements</p>
            <p className="text-sm">Upload more pipeline snapshots to track deal progression</p>
          </div>
        ) : (
          <div className="space-y-4">
            {movements.slice(0, 5).map((movement: any, index: number) => {
              const { icon: Icon, bgColor, iconColor } = getMovementIcon(movement.from, movement.to);
              
              return (
                <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`w-10 h-10 ${bgColor} rounded-full flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">{movement.opportunityName}</p>
                      <span className="text-xs text-gray-500">{formatTimeAgo(movement.date)}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Moved from <span className="font-medium">{movement.from}</span> → <span className="font-medium">{movement.to}</span>
                      {movement.value > 0 && (
                        <span className="ml-2 text-gray-500">• {formatCurrency(movement.value)}</span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
