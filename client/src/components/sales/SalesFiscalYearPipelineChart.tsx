import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SalesFilterState } from '@/types/sales';
import { useState } from 'react';

interface SalesFiscalYearPipelineChartProps {
  filters: SalesFilterState;
}

type TimeView = 'year' | 'quarter' | 'month';

export default function SalesFiscalYearPipelineChart({ filters }: SalesFiscalYearPipelineChartProps) {
  const [timeView, setTimeView] = useState<TimeView>('year');
  
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
    queryKey: ['/api/sales/analytics', queryParams.toString()],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            Sales Pipeline Value Over Time
            {filters.salesRep !== 'all' && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                - {filters.salesRep}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  // Get data based on selected time view
  const getData = () => {
    switch (timeView) {
      case 'year':
        return analytics?.fiscalYearPipeline?.map(item => ({ 
          label: item.fiscalYear.replace('FY', '').replace('2026', '2025'), 
          value: item.value 
        })) || [];
      case 'quarter':
        return analytics?.fiscalQuarterPipeline?.map(item => ({ 
          label: item.fiscalQuarter.replace('2026', '2025'), 
          value: item.value 
        })) || [];
      case 'month':
        return analytics?.monthlyPipeline?.map(item => ({ label: item.month, value: item.value })) || [];
      default:
        return [];
    }
  };

  const data = getData();

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value}`;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-blue-600">
            Pipeline Value: {formatValue(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            Sales Pipeline Value Over Time
            {filters.salesRep !== 'all' && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                - {filters.salesRep}
              </span>
            )}
          </CardTitle>
          <div className="flex space-x-1">
            <Button
              variant={timeView === 'year' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeView('year')}
            >
              Year
            </Button>
            <Button
              variant={timeView === 'quarter' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeView('quarter')}
            >
              Quarter
            </Button>
            <Button
              variant={timeView === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeView('month')}
            >
              Month
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 12 }}
                  angle={timeView === 'month' ? -45 : 0}
                  textAnchor={timeView === 'month' ? 'end' : 'middle'}
                  height={timeView === 'month' ? 60 : 30}
                />
                <YAxis 
                  tickFormatter={formatValue}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No data available for the selected filters
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}