import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import type { CustomerJourneyData } from '../hooks/useCustomerJourneyData';

interface TouchDistributionChartProps {
  data: CustomerJourneyData[];
}

const TouchDistributionChart: React.FC<TouchDistributionChartProps> = ({ data }) => {
  const chartData = useMemo(() => {
    const touchCounts = data.reduce((acc, customer) => {
      const touches = customer.touches;
      acc[touches] = (acc[touches] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return Object.entries(touchCounts)
      .map(([touches, count]) => ({
        touches: parseInt(touches),
        customers: count,
        percentage: (count / data.length) * 100
      }))
      .sort((a, b) => a.touches - b.touches);
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label} Touch{label !== 1 ? 'es' : ''}</p>
          <p className="text-blue-600">
            <span className="font-medium">{data.customers}</span> customers ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          Touch Distribution Analysis
        </CardTitle>
        <CardDescription>
          Customer distribution by number of campaign touchpoints
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="touches" 
                tick={{ fontSize: 12 }}
                label={{ value: 'Number of Touches', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Customers', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="customers" 
                fill="#3b82f6" 
                radius={[4, 4, 0, 0]}
                className="hover:opacity-80"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-800">Single Touch</p>
            <p className="text-2xl font-bold text-blue-900">
              {chartData.find(d => d.touches === 1)?.customers || 0}
            </p>
            <p className="text-xs text-blue-600">
              {(chartData.find(d => d.touches === 1)?.percentage || 0).toFixed(1)}% of customers
            </p>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-sm font-medium text-green-800">Multi-Touch</p>
            <p className="text-2xl font-bold text-green-900">
              {chartData.filter(d => d.touches > 1).reduce((sum, d) => sum + d.customers, 0)}
            </p>
            <p className="text-xs text-green-600">
              {chartData.filter(d => d.touches > 1).reduce((sum, d) => sum + d.percentage, 0).toFixed(1)}% of customers
            </p>
          </div>
          
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <p className="text-sm font-medium text-purple-800">Average Touches</p>
            <p className="text-2xl font-bold text-purple-900">
              {(chartData.reduce((sum, d) => sum + (d.touches * d.customers), 0) / 
                chartData.reduce((sum, d) => sum + d.customers, 0)).toFixed(1)}
            </p>
            <p className="text-xs text-purple-600">
              Per customer journey
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TouchDistributionChart;