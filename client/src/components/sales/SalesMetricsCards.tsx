import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Briefcase, Target, Trophy, TrendingUp, TrendingDown, Calculator, Award } from "lucide-react";
import { SalesFilterState } from "@/types/sales";
import { getDateRangeByValue } from "@/utils/dateRanges";
import { useMemo } from "react";

interface SalesMetricsCardsProps {
  filters: SalesFilterState;
}

export default function SalesMetricsCards({ filters }: SalesMetricsCardsProps) {
  // Calculate date ranges for Win Rate (FY to Date) and Close Rate (Last 12 months)
  const winRateDateRange = useMemo(() => {
    return getDateRangeByValue("fy-to-date");
  }, []);

  const closeRateDateRange = useMemo(() => {
    return getDateRangeByValue("last-12-months");
  }, []);

  // Build query parameters for sales analytics
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

  // Main analytics query for general metrics
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['/api/sales/analytics', queryParams.toString()],
  });

  // Win Rate query with FY to Date range
  const { data: winRateData, isLoading: winRateLoading } = useQuery({
    queryKey: ['/api/sales/analytics', 'winrate', winRateDateRange.startDate?.toISOString(), winRateDateRange.endDate?.toISOString(), filters.salesRep],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (winRateDateRange.startDate) {
        params.append('startDate', winRateDateRange.startDate.toISOString().split('T')[0]);
      }
      if (winRateDateRange.endDate) {
        params.append('endDate', winRateDateRange.endDate.toISOString().split('T')[0]);
      }
      if (filters.salesRep !== 'all') {
        params.append('salesRep', filters.salesRep);
      }
      
      const response = await fetch(`/api/sales/analytics?${params}`);
      if (!response.ok) throw new Error('Failed to fetch win rate data');
      return response.json();
    }
  });

  // Close Rate query with Last 12 months range
  const { data: closeRateData, isLoading: closeRateLoading } = useQuery({
    queryKey: ['/api/sales/analytics', 'closerate', closeRateDateRange.startDate?.toISOString(), closeRateDateRange.endDate?.toISOString(), filters.salesRep],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (closeRateDateRange.startDate) {
        params.append('startDate', closeRateDateRange.startDate.toISOString().split('T')[0]);
      }
      if (closeRateDateRange.endDate) {
        params.append('endDate', closeRateDateRange.endDate.toISOString().split('T')[0]);
      }
      if (filters.salesRep !== 'all') {
        params.append('salesRep', filters.salesRep);
      }
      
      const response = await fetch(`/api/sales/analytics?${params}`);
      if (!response.ok) throw new Error('Failed to fetch close rate data');
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metrics = analytics?.metrics || {};
  const winRate = winRateData?.winRate || 0;
  const closeRate = closeRateData?.closeRate || 0;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value?.toFixed(0) || 0}`;
    }
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const cards = [
    {
      title: "Total Pipeline Value",
      value: formatCurrency(metrics.totalValue || 0),
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
      change: metrics.valueChange || 0,
      subtitle: filters.salesRep !== 'all' ? `for ${filters.salesRep}` : "across all reps"
    },
    {
      title: "Active Opportunities",
      value: (metrics.activeCount || 0).toLocaleString(),
      icon: Briefcase,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      change: metrics.countChange || 0,
      subtitle: filters.salesRep !== 'all' ? `managed by ${filters.salesRep}` : "total active"
    },
    {
      title: "Average Deal Size",
      value: formatCurrency(metrics.avgDealSize || 0),
      icon: Calculator,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      change: metrics.avgDealChange || 0,
      subtitle: filters.salesRep !== 'all' ? `${filters.salesRep}'s average` : "overall average"
    },
    {
      title: "Conversion Rate",
      value: formatPercent(metrics.conversionRate || 0),
      icon: Target,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      change: metrics.conversionChange || 0,
      subtitle: "stage progression rate"
    },
    {
      title: "Win Rate",
      value: formatPercent(winRate),
      icon: Trophy,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      change: winRateData?.winRateChange || 0,
      subtitle: "FY to Date"
    },
    {
      title: "Close Rate",
      value: formatPercent(closeRate),
      icon: Award,
      color: "text-red-600",
      bgColor: "bg-red-50",
      change: closeRateData?.closeRateChange || 0,
      subtitle: "Last 12 Months"
    },
    {
      title: "Deals Closed (Won)",
      value: (metrics.closedWonCount || 0).toLocaleString(),
      icon: Trophy,
      color: "text-green-600",
      bgColor: "bg-green-50",
      change: metrics.closedWonChange || 0,
      subtitle: filters.salesRep !== 'all' ? `by ${filters.salesRep}` : "total closed won"
    },
    {
      title: "Pipeline Velocity",
      value: `${metrics.avgDaysToClose || 0} days`,
      icon: TrendingUp,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      change: metrics.velocityChange || 0,
      subtitle: "average time to close"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {card.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {card.value}
                </p>
                <p className="text-xs text-gray-500">
                  {card.subtitle}
                </p>
                {card.change !== 0 && (
                  <div className={`flex items-center mt-2 text-xs ${
                    card.change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {card.change > 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    <span>{Math.abs(card.change).toFixed(1)}%</span>
                  </div>
                )}
              </div>
              <div className={`p-3 rounded-full ${card.bgColor}`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}