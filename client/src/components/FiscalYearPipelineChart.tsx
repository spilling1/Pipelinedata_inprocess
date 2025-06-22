import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FilterState } from '@/types/pipeline';
import { useState } from 'react';

interface FiscalYearPipelineChartProps {
  filters: FilterState;
}

type TimeView = 'year' | 'quarter' | 'month';

export default function FiscalYearPipelineChart({ filters }: FiscalYearPipelineChartProps) {
  const [timeView, setTimeView] = useState<TimeView>('year');
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['/api/analytics', filters],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Value Over Time</CardTitle>
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

  const chartData = getData();

  const getTitle = () => {
    return 'Pipeline Value';
  };

  const getSubtitle = () => {
    switch (timeView) {
      case 'year':
        return 'Fiscal Year: Feb 1 - Jan 31';
      case 'quarter':
        return 'Fiscal Quarters: Q1(Feb-Apr), Q2(May-Jul), Q3(Aug-Oct), Q4(Nov-Jan)';
      case 'month':
        return 'Monthly pipeline values';
      default:
        return '';
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value.toFixed(0)}`;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-sm text-blue-600">
            Pipeline Value: {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{getTitle()}</CardTitle>
            <p className="text-sm text-gray-600">{getSubtitle()}</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={timeView === 'year' ? 'default' : 'outline'}
              onClick={() => setTimeView('year')}
            >
              Year
            </Button>
            <Button
              size="sm"
              variant={timeView === 'quarter' ? 'default' : 'outline'}
              onClick={() => setTimeView('quarter')}
            >
              Quarter
            </Button>
            <Button
              size="sm"
              variant={timeView === 'month' ? 'default' : 'outline'}
              onClick={() => setTimeView('month')}
            >
              Month
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="label" 
                  stroke="#666"
                  fontSize={12}
                  angle={timeView === 'month' ? -45 : 0}
                  textAnchor={timeView === 'month' ? 'end' : 'middle'}
                  height={timeView === 'month' ? 60 : 30}
                />
                <YAxis 
                  stroke="#666"
                  fontSize={12}
                  tickFormatter={formatCurrency}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-lg font-medium mb-2">No data available</p>
                <p className="text-sm">Upload pipeline files to see {timeView === 'year' ? 'fiscal year' : timeView === 'quarter' ? 'fiscal quarter' : 'monthly'} trends</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}