import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { SalesFilterState } from "@/types/sales";

interface SalesValueChangeCardProps {
  filters: SalesFilterState;
}

export default function SalesValueChangeCard({ filters }: SalesValueChangeCardProps) {
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
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Value Changes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const valueChangeData = analytics?.valueChanges || [];

  const formatCurrency = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue >= 1000000) {
      return `${value < 0 ? '-' : ''}$${(absValue / 1000000).toFixed(1)}M`;
    } else if (absValue >= 1000) {
      return `${value < 0 ? '-' : ''}$${(absValue / 1000).toFixed(0)}K`;
    } else {
      return `${value < 0 ? '-' : ''}$${absValue?.toFixed(0) || 0}`;
    }
  };

  const formatPercent = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getChangeColor = (value: number) => {
    if (value > 0) return 'bg-green-100 text-green-800';
    if (value < 0) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const totalValueChange = valueChangeData.reduce((sum: number, item: any) => sum + item.valueChange, 0);
  const totalPercentChange = valueChangeData.reduce((sum: number, item: any) => sum + item.percentChange, 0) / (valueChangeData.length || 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-blue-500" />
          Value Changes
          {filters.salesRep !== 'all' && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              - {filters.salesRep}
            </span>
          )}
        </CardTitle>
        <div className="flex items-center gap-4 text-sm">
          <div className={`flex items-center gap-1 ${totalValueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalValueChange >= 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            <span>{formatCurrency(totalValueChange)}</span>
          </div>
          <div className={`${totalPercentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPercent(totalPercentChange)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {valueChangeData.length > 0 ? (
            valueChangeData.map((item: any, index: number) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{item.opportunityName}</span>
                  <div className="flex items-center gap-2">
                    <Badge className={getChangeColor(item.valueChange)}>
                      {formatCurrency(item.valueChange)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {formatPercent(item.percentChange)}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                  <div>
                    <span className="font-medium">Previous:</span> {formatCurrency(item.previousValue)}
                  </div>
                  <div>
                    <span className="font-medium">Current:</span> {formatCurrency(item.currentValue)}
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 mt-1">
                  <span className="font-medium">Client:</span> {item.clientName || 'N/A'}
                  {item.stage && (
                    <>
                      <span className="mx-2">•</span>
                      <span className="font-medium">Stage:</span> {item.stage}
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No value changes detected</p>
              <p className="text-xs">Opportunity values appear stable</p>
            </div>
          )}
        </div>
        
        {valueChangeData.length > 5 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Showing recent value changes
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}