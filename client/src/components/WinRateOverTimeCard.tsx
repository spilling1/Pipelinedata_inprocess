import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

interface WinRateOverTimeCardProps {
  filters?: any;
}

interface WinRateDataPoint {
  date: string;
  fiscalYear: string;
  fyWinRate: number | null;
  rolling12WinRate: number | null;
}

export default function WinRateOverTimeCard({ filters }: WinRateOverTimeCardProps) {
  const { data: winRateData, isLoading } = useQuery({
    queryKey: ['/api/analytics/win-rate-over-time'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/win-rate-over-time');
      if (!response.ok) throw new Error('Failed to fetch win rate over time data');
      return response.json();
    }
  });

  const chartData = winRateData?.winRateData || [];

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: '2-digit'
    });
  };

  // Custom tooltip to show formatted values
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-700">
                {entry.name}: {entry.value ? `${entry.value.toFixed(1)}%` : 'No data'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Win Rate Over Time
        </CardTitle>
        <p className="text-sm text-gray-600">
          Historical win rate trends comparing fiscal year to date vs rolling 12-month calculations
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium">No win rate data available</p>
              <p className="text-sm">Upload historical data to see win rate trends</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Chart */}
            <ResponsiveContainer width="100%" height={320}>
              <LineChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 20,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  stroke="#666"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#666"
                  fontSize={12}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="fyWinRate"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                  name="FY to Date"
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="rolling12WinRate"
                  stroke="#dc2626"
                  strokeWidth={2}
                  dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
                  name="Rolling 12 Months"
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Summary Statistics */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {chartData.length > 0 && chartData[chartData.length - 1]?.fyWinRate 
                    ? `${chartData[chartData.length - 1].fyWinRate.toFixed(1)}%`
                    : 'N/A'
                  }
                </div>
                <div className="text-sm text-gray-600">Latest FY to Date</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {chartData.length > 0 && chartData[chartData.length - 1]?.rolling12WinRate 
                    ? `${chartData[chartData.length - 1].rolling12WinRate.toFixed(1)}%`
                    : 'N/A'
                  }
                </div>
                <div className="text-sm text-gray-600">Latest Rolling 12 Months</div>
              </div>
            </div>

            {/* Data Note */}
            <div className="text-xs text-gray-500 mt-4 p-3 bg-gray-50 rounded-lg">
              <p><strong>FY to Date:</strong> Win rate for deals that closed within the fiscal year (Feb 1 - Jan 31)</p>
              <p><strong>Rolling 12 Months:</strong> Win rate for deals that closed within the last 12 months from each data point</p>
              <p>Data points shown only when closed deals exist for the respective time periods</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}