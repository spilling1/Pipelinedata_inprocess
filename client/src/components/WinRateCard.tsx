import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { dateRangeOptions, getDateRangeByValue } from "@/utils/dateRanges";

interface WinRateCardProps {
  filters?: any;
}

export default function WinRateCard({ filters }: WinRateCardProps) {
  const [selectedDateRange, setSelectedDateRange] = useState("fy-to-date");
  
  // Calculate date range based on selection
  const dateRange = useMemo(() => {
    return getDateRangeByValue(selectedDateRange);
  }, [selectedDateRange]);

  const { data: winRateData, isLoading } = useQuery({
    queryKey: ['/api/analytics/win-rate', dateRange.startDate?.toISOString(), dateRange.endDate?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate.toISOString().split('T')[0]);
      }
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate.toISOString().split('T')[0]);
      }
      
      const response = await fetch(`/api/analytics/win-rate?${params}`);
      if (!response.ok) throw new Error('Failed to fetch win rate data');
      return response.json();
    }
  });

  const winRate = winRateData?.conversionRate || 0;
  
  // Memoize color calculations
  const { winRateColor, winRateTextColor } = useMemo(() => ({
    winRateColor: winRate >= 30 ? 'bg-green-500' : winRate >= 20 ? 'bg-yellow-500' : 'bg-red-500',
    winRateTextColor: winRate >= 30 ? 'text-green-600' : winRate >= 20 ? 'text-yellow-600' : 'text-red-600'
  }), [winRate]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-green-600" />
            <CardTitle className="font-semibold tracking-tight text-[24px]">Win Rate</CardTitle>
          </div>
          <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateRangeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-gray-600">Percentage of closed deals that were won</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p className="text-sm">Loading win rate data...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Win Rate Display */}
            <div className="text-center">
              <div className={`text-6xl font-bold ${winRateTextColor} mb-2`}>
                {winRate.toFixed(1)}%
              </div>
              <Badge 
                variant="outline" 
                className={`${winRateColor} text-white border-0 px-3 py-1`}
              >
                {winRate >= 30 ? 'Excellent' : winRate >= 20 ? 'Good' : 'Needs Improvement'}
              </Badge>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Win Rate</span>
                <span>{winRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`${winRateColor} h-3 rounded-full transition-all duration-300`}
                  style={{ width: `${Math.min(winRate, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Context Information */}
            <div className="text-xs text-gray-500 text-center">
              <p>Based on deals that closed in the current fiscal year</p>
              <p>Excludes accounts with both active and closed opportunities</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}