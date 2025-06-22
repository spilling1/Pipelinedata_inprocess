import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertTriangle, Users, ChevronDown, ChevronRight } from "lucide-react";
import { FilterState } from "@/types/pipeline";
import { useState } from "react";

interface DuplicateOpportunitiesCardProps {
  filters: FilterState;
}

interface DuplicateGroup {
  clientName: string;
  opportunities: Array<{
    id: number;
    name: string;
    opportunityId: string;
    owner?: string;
    isActive?: boolean;
    closeDate?: string;
    latestSnapshot?: {
      stage: string;
      amount: number;
    };
  }>;
  totalValue: number;
  totalOpportunitiesCount: number;
  activeOpportunitiesCount: number;
}

export default function DuplicateOpportunitiesCard({ filters }: DuplicateOpportunitiesCardProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const { data: duplicateGroups, isLoading } = useQuery({
    queryKey: ['/api/duplicate-opportunities', filters],
  });

  const toggleGroup = (clientName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(clientName)) {
      newExpanded.delete(clientName);
    } else {
      newExpanded.add(clientName);
    }
    setExpandedGroups(newExpanded);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Renewed Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Data is now provided directly from the backend endpoint
  const duplicateGroupsData: DuplicateGroup[] = (duplicateGroups as DuplicateGroup[]) || [];

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value.toFixed(0)}`;
    }
  };

  const totalDuplicates = duplicateGroupsData.reduce((sum, group) => sum + group.opportunities.length, 0);
  const totalDuplicateValue = duplicateGroupsData.reduce((sum, group) => sum + group.totalValue, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Renewed Opportunities
        </CardTitle>
        {duplicateGroupsData.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-orange-600">
            <AlertTriangle className="h-4 w-4" />
            {duplicateGroupsData.length} clients with {totalDuplicates} active opportunities
          </div>
        )}
      </CardHeader>
      <CardContent>
        {duplicateGroupsData.length > 0 ? (
          <div className="space-y-4">
            {/* Renewed Opportunity Groups */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {duplicateGroupsData.map((group) => (
                <Collapsible key={group.clientName}>
                  <div className="border rounded-lg p-3 bg-gray-50">
                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="w-full p-0 h-auto justify-between hover:bg-transparent"
                        onClick={() => toggleGroup(group.clientName)}
                      >
                        <div className="font-medium text-gray-900 flex justify-between items-center w-full">
                          <div className="flex items-center gap-2">
                            {expandedGroups.has(group.clientName) ? 
                              <ChevronDown className="h-4 w-4" /> : 
                              <ChevronRight className="h-4 w-4" />
                            }
                            <span className="truncate">{group.clientName}</span>
                            <span className="text-xs text-gray-500">
                              ({group.activeOpportunitiesCount} active of {group.totalOpportunitiesCount} total)
                            </span>
                          </div>
                          <span className="text-sm font-bold text-blue-600">
                            {formatCurrency(group.totalValue)}
                          </span>
                        </div>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="space-y-3 pl-6">
                        {/* Active Opportunities */}
                        {group.opportunities.filter(opp => opp.isActive).length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              Active Opportunities ({group.opportunities.filter(opp => opp.isActive).length})
                            </div>
                            <div className="space-y-1">
                              {group.opportunities.filter(opp => opp.isActive).map((opp) => (
                                <div key={opp.id} className="text-xs text-gray-600 flex justify-between bg-green-50 p-2 rounded">
                                  <div className="flex flex-col">
                                    <span className="truncate font-medium">{opp.name}</span>
                                    <span className="text-gray-400">ID: {opp.opportunityId}</span>
                                    {opp.owner && <span className="text-gray-400">Owner: {opp.owner}</span>}
                                  </div>
                                  <div className="text-right">
                                    <div className="text-blue-500">
                                      {opp.latestSnapshot?.stage || 'Unknown'}
                                    </div>
                                    <div className="text-green-600 font-medium">
                                      {formatCurrency(opp.latestSnapshot?.amount || 0)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Previous Opportunities */}
                        {group.opportunities.filter(opp => !opp.isActive).length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                              Previous Opportunities ({group.opportunities.filter(opp => !opp.isActive).length})
                            </div>
                            <div className="space-y-1">
                              {group.opportunities.filter(opp => !opp.isActive).map((opp) => (
                                <div key={opp.id} className="text-xs text-gray-500 flex justify-between bg-gray-50 p-2 rounded">
                                  <div className="flex flex-col">
                                    <span className="truncate font-medium">{opp.name}</span>
                                    <span className="text-gray-400">ID: {opp.opportunityId}</span>
                                    {opp.owner && <span className="text-gray-400">Owner: {opp.owner}</span>}
                                    {opp.closeDate && (
                                      <span className="text-gray-400">
                                        Closed: {new Date(opp.closeDate).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <div className="text-red-500">
                                      {opp.latestSnapshot?.stage || 'Unknown'}
                                    </div>
                                    <div className="text-gray-600 font-medium">
                                      {formatCurrency(opp.latestSnapshot?.amount || 0)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium mb-1">No duplicate opportunities found</p>
            <p className="text-xs">All client names appear to be unique</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}