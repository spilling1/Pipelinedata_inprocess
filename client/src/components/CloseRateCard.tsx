import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { dateRangeOptions, getDateRangeByValue } from "@/utils/dateRanges";

interface CloseRateCardProps {
  filters?: any;
}

export default function CloseRateCard({ filters }: CloseRateCardProps) {
  const [selectedDateRange, setSelectedDateRange] = useState("last-12-months");
  
  // Calculate date range based on selection
  const dateRange = useMemo(() => {
    return getDateRangeByValue(selectedDateRange);
  }, [selectedDateRange]);

  const { data: closeRateData, isLoading } = useQuery({
    queryKey: ['/api/analytics/close-rate', dateRange.startDate?.toISOString(), dateRange.endDate?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate.toISOString().split('T')[0]);
      }
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate.toISOString().split('T')[0]);
      }
      
      const response = await fetch(`/api/analytics/close-rate?${params}`);
      if (!response.ok) throw new Error('Failed to fetch close rate data');
      return response.json();
    }
  });

  const closeRate = closeRateData?.closeRate || 0;
  
  // Memoize color calculations
  const { closeRateColor, closeRateTextColor } = useMemo(() => ({
    closeRateColor: closeRate >= 25 ? 'bg-blue-500' : closeRate >= 15 ? 'bg-orange-500' : 'bg-red-500',
    closeRateTextColor: closeRate >= 25 ? 'text-blue-600' : closeRate >= 15 ? 'text-orange-600' : 'text-red-600'
  }), [closeRate]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-600" />
            <CardTitle className="font-semibold tracking-tight text-[24px]">Close Rate</CardTitle>
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
        <p className="text-sm text-gray-600">Percentage of pipeline entries that closed won</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p className="text-sm">Loading close rate data...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Close Rate Display */}
            <div className="text-center">
              <div className={`text-6xl font-bold ${closeRateTextColor} mb-2`}>
                {closeRate.toFixed(1)}%
              </div>
              <Badge 
                variant="outline" 
                className={`${closeRateColor} text-white border-0 px-3 py-1`}
              >
                {closeRate >= 25 ? 'Strong' : closeRate >= 15 ? 'Average' : 'Below Target'}
              </Badge>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Close Rate</span>
                <span>{closeRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`${closeRateColor} h-3 rounded-full transition-all duration-300`}
                  style={{ width: `${Math.min(closeRate, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Context Information */}
            <div className="text-xs text-gray-500 text-center">
              <p>Based on deals that entered pipeline in the last 12 months</p>
              <p>Excludes validation stage and deals without entered_pipeline date</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}