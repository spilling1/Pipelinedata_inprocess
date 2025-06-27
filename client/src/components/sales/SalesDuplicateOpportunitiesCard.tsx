import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users, DollarSign } from "lucide-react";
import { SalesFilterState } from "@/types/sales";

interface SalesDuplicateOpportunitiesCardProps {
  filters: SalesFilterState;
}

export default function SalesDuplicateOpportunitiesCard({ filters }: SalesDuplicateOpportunitiesCardProps) {
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
            <AlertTriangle className="h-5 w-5" />
            Duplicate Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const duplicateData = analytics?.duplicateOpportunities || [];

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value?.toFixed(0) || 0}`;
    }
  };

  const totalDuplicates = duplicateData.length;
  const totalValue = duplicateData.reduce((sum: number, item: any) => sum + item.totalValue, 0);
  const totalOpportunities = duplicateData.reduce((sum: number, item: any) => sum + item.totalOpportunitiesCount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Duplicate Opportunities
          {filters.salesRep !== 'all' && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              - {filters.salesRep}
            </span>
          )}
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{totalDuplicates} clients</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            <span>{formatCurrency(totalValue)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {duplicateData.length > 0 ? (
            duplicateData.slice(0, 10).map((client: any) => (
              <div key={client.clientName} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{client.clientName}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {client.totalOpportunitiesCount} opps
                      </Badge>
                      <Badge className="bg-orange-100 text-orange-800 text-xs">
                        {formatCurrency(client.totalValue)}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">
                    Active: {client.activeOpportunitiesCount} | 
                    {filters.salesRep !== 'all' && client.opportunities.some((opp: any) => opp.owner === filters.salesRep) && (
                      <span className="ml-1 text-green-600 font-medium">Your client</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Owners: {client.opportunities.map((opp: any) => opp.owner).filter((owner: string, index: number, arr: string[]) => arr.indexOf(owner) === index).join(', ')}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No duplicate opportunities found</p>
              <p className="text-xs">This is good - no conflicts detected</p>
            </div>
          )}
        </div>
        
        {duplicateData.length > 10 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Showing 10 of {duplicateData.length} clients with duplicates
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}