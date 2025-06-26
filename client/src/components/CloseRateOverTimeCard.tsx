import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface CloseRateDataPoint {
  date: string;
  closeRate: number;
  closedDeals: Array<{
    name: string;
    stage: string;
    year1Arr: number;
    closeDate: string;
  }>;
}

export function CloseRateOverTimeCard() {
  const { data, isLoading, error } = useQuery<{ closeRateData: CloseRateDataPoint[]; currentOpenDeals: number }>({
    queryKey: ['/api/analytics/close-rate-over-time'],
  });

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yy');
    } catch {
      return dateString;
    }
  };

  const formatTooltipDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const dataPoint = data?.closeRateData.find(d => d.date === label);
    if (!dataPoint) return null;

    return (
      <div className="bg-white p-4 border border-gray-300 rounded-lg shadow-lg max-w-md">
        <p className="font-semibold text-gray-800 mb-2">{formatTooltipDate(label)}</p>
        
        <div className="mb-3">
          <div className="flex items-center mb-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span className="text-sm font-medium text-gray-700">
              Close Rate: {payload[0].value ? `${payload[0].value.toFixed(1)}%` : 'No data'}
            </span>
          </div>
        </div>

        {/* Show deal details if available */}
        {dataPoint.closedDeals && dataPoint.closedDeals.length > 0 && (
          <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs max-h-40 overflow-y-auto">
            <div className="space-y-3">
              <p className="font-semibold text-gray-800 text-center border-b border-gray-300 pb-2">
                Deals Closed in Period (through {formatDate(label)})
              </p>
              
              {(() => {
                // Separate deals into won and lost
                const wonDeals = dataPoint.closedDeals.filter((deal: any) => deal.stage.toLowerCase().includes('won'));
                const lostDeals = dataPoint.closedDeals.filter((deal: any) => !deal.stage.toLowerCase().includes('won'));
                
                return (
                  <>
                    {/* Closed Won Section */}
                    {wonDeals.length > 0 && (
                      <div>
                        <p className="text-green-700 font-semibold mb-2 text-left">Closed Won:</p>
                        <div className="space-y-1">
                          {wonDeals.slice(0, 6).map((deal: any, i: number) => (
                            <div key={`won-${i}`} className="flex justify-between items-center py-1">
                              <span className="text-gray-700 truncate mr-3 flex-1 text-left" title={deal.name}>
                                {deal.name}
                              </span>
                              <span className="text-green-600 font-semibold whitespace-nowrap">
                                ${deal.year1Arr?.toLocaleString() || 0}
                              </span>
                            </div>
                          ))}
                          {wonDeals.length > 6 && (
                            <p className="text-gray-500 text-center mt-2 italic">
                              ...and {wonDeals.length - 6} more won
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Closed Lost Section */}
                    {lostDeals.length > 0 && (
                      <div>
                        <p className="text-red-700 font-semibold mb-2 text-left">Closed Lost:</p>
                        <div className="space-y-1">
                          {lostDeals.slice(0, 6).map((deal: any, i: number) => (
                            <div key={`lost-${i}`} className="flex justify-between items-center py-1">
                              <span className="text-gray-700 truncate mr-3 flex-1 text-left" title={deal.name}>
                                {deal.name}
                              </span>
                              <span className="text-red-600 font-semibold whitespace-nowrap">
                                ${deal.year1Arr?.toLocaleString() || 0}
                              </span>
                            </div>
                          ))}
                          {lostDeals.length > 6 && (
                            <p className="text-gray-500 text-center mt-2 italic">
                              ...and {lostDeals.length - 6} more lost
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Close Rate Over Time</CardTitle>
          <CardDescription>Loading open deals count...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading close rate data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Close Rate Over Time</CardTitle>
          <CardDescription>Error loading data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <p className="text-red-600">Error loading close rate data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data?.closeRateData || [];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Close Rate Over Time</CardTitle>
        <CardDescription>
          {data?.currentOpenDeals ? `${data.currentOpenDeals} Open Deals in current snapshot` : 'Rolling 12-month close rate trend'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-80 flex items-center justify-center">
            <p className="text-gray-600">No close rate data available</p>
          </div>
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  stroke="#666"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  stroke="#666"
                  fontSize={12}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="closeRate" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={false}
                  name="Rolling 12 Months"
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {chartData.length > 0 ? `${chartData[chartData.length - 1]?.closeRate?.toFixed(1) || 0}%` : '0%'}
                </div>
                <div className="text-sm text-gray-600">Latest Close Rate</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">
                  {data?.currentOpenDeals || 0}
                </div>
                <div className="text-sm text-gray-600">Open Deals</div>
              </div>
            </div>

            {/* Data Note */}
            <div className="text-xs text-gray-500 mt-4 p-3 bg-gray-50 rounded-lg">
              <p><strong>Rolling 12 Months:</strong> Close rate for deals that closed within the last 12 months from each data point</p>
              <p><strong>Close Rate:</strong> Closed Won / (Closed Won + Closed Lost + Open Pipeline)</p>
              <p>Data points shown only when closed deals exist for the respective time periods</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}