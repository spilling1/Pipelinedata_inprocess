import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Briefcase, Target, Trophy, TrendingUp, TrendingDown, Calculator, Award } from "lucide-react";
import { FilterState } from "@/types/pipeline";
import { getDateRangeByValue } from "@/utils/dateRanges";
import { useMemo } from "react";

interface MetricsCardsProps {
  filters: FilterState;
}

export default function MetricsCards({ filters }: MetricsCardsProps) {
  // Calculate date ranges for Win Rate (FY to Date) and Close Rate (Last 12 months)
  const winRateDateRange = useMemo(() => {
    return getDateRangeByValue("fy-to-date");
  }, []);

  const closeRateDateRange = useMemo(() => {
    return getDateRangeByValue("last-12-months");
  }, []);

  // Main analytics query for general metrics (without date filter)
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['/api/analytics', filters],
  });

  // Win Rate query with FY to Date range
  const { data: winRateData, isLoading: winRateLoading } = useQuery({
    queryKey: ['/api/analytics', winRateDateRange.startDate?.toISOString(), winRateDateRange.endDate?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (winRateDateRange.startDate) {
        params.append('startDate', winRateDateRange.startDate.toISOString().split('T')[0]);
      }
      if (winRateDateRange.endDate) {
        params.append('endDate', winRateDateRange.endDate.toISOString().split('T')[0]);
      }
      
      const response = await fetch(`/api/analytics?${params}`);
      if (!response.ok) throw new Error('Failed to fetch win rate data');
      return response.json();
    }
  });

  // Close Rate query with Last 12 months range
  const { data: closeRateData, isLoading: closeRateLoading } = useQuery({
    queryKey: ['/api/analytics', closeRateDateRange.startDate?.toISOString(), closeRateDateRange.endDate?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (closeRateDateRange.startDate) {
        params.append('startDate', closeRateDateRange.startDate.toISOString().split('T')[0]);
      }
      if (closeRateDateRange.endDate) {
        params.append('endDate', closeRateDateRange.endDate.toISOString().split('T')[0]);
      }
      
      const response = await fetch(`/api/analytics?${params}`);
      if (!response.ok) throw new Error('Failed to fetch close rate data');
      return response.json();
    }
  });

  if (isLoading || winRateLoading || closeRateLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metrics = (analytics as any)?.metrics || {
    totalValue: 0,
    activeCount: 0,
    avgDealSize: 0,
    avgDealSizePipeline: 0,
    avgDealSizeClosedWon: 0,
    conversionRate: 0,
    closeRate: 0,
    totalContractValue: 0,
    totalYear1Arr: 0
  };

  // Get Win Rate and Close Rate from their respective queries
  const winRate = (winRateData as any)?.metrics?.conversionRate || 0;
  const closeRate = (closeRateData as any)?.metrics?.closeRate || 0;
  
  // Get fiscal year average deal size for closed won from winRateData (matches ClosedWonFYCard)
  const fyAvgDealSizeClosedWon = (winRateData as any)?.metrics?.avgDealSizeClosedWon || 0;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value.toFixed(0)}`;
    }
  };

  const metricCards = [
    {
      title: "Total Year 1 ARR",
      value: formatCurrency(metrics.totalYear1Arr || 0),
      icon: DollarSign,
      change: "+12%",
      changeType: "positive" as const,
      subtitle: "from last month",
      bgColor: "bg-green-100",
      iconColor: "text-green-600"
    },
    {
      title: "Total Contract Value",
      value: formatCurrency(metrics.totalContractValue || 0),
      icon: Calculator,
      change: "+15%",
      changeType: "positive" as const,
      subtitle: "all value types",
      bgColor: "bg-emerald-100",
      iconColor: "text-emerald-600"
    },
    {
      title: "Active Opportunities",
      value: metrics.activeCount.toString(),
      icon: Briefcase,
      change: "+3",
      changeType: "positive" as const,
      subtitle: "new this week",
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600"
    },
    {
      title: "Avg. Deal Size",
      value: formatCurrency(metrics.avgDealSizePipeline || metrics.avgDealSize || 0),
      secondaryValue: formatCurrency(fyAvgDealSizeClosedWon || 0),
      icon: Target,
      change: "+8%",
      changeType: "positive" as const,
      subtitle: "pipeline / closed won",
      bgColor: "bg-purple-100",
      iconColor: "text-purple-600"
    },
    {
      title: "Win Rate (FY to Date)",
      value: `${winRate.toFixed(1)}%`,
      secondaryValue: `${closeRate.toFixed(1)}%`,
      icon: Trophy,
      change: "+4%",
      changeType: "positive" as const,
      subtitle: "improvement",
      bgColor: "bg-orange-100",
      iconColor: "text-orange-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {metricCards.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <div className="flex flex-col gap-1">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                      {metric.title === "Avg. Deal Size" && (
                        <p className="text-xs text-gray-500">Pipeline</p>
                      )}
                    </div>
                    {(metric as any).secondaryValue && (
                      <div>
                        <p className="text-lg font-semibold text-gray-600">{(metric as any).secondaryValue}</p>
                        <p className="text-xs text-gray-500">
                          {metric.title === "Win Rate (FY to Date)" ? "Close Rate (Last 12 months)" : "Closed Won (FY)"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className={`w-12 h-12 ${metric.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${metric.iconColor}`} />
                </div>
              </div>

            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
