import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import { SalesFilterState } from "@/types/sales";
import { useState } from "react";

interface SalesOpportunitiesTableProps {
  filters: SalesFilterState;
}

export default function SalesOpportunitiesTable({ filters }: SalesOpportunitiesTableProps) {
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ['/api/sales/opportunities', queryParams.toString()],
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value?.toFixed(0) || 0}`;
    }
  };

  const getStageColor = (stage: string) => {
    const stageColors: { [key: string]: string } = {
      'Prospecting': 'bg-gray-100 text-gray-800',
      'Qualification': 'bg-yellow-100 text-yellow-800',
      'Proposal': 'bg-blue-100 text-blue-800',
      'Negotiation': 'bg-green-100 text-green-800',
      'Closed Won': 'bg-green-100 text-green-800',
      'Closed Lost': 'bg-red-100 text-red-800',
    };
    return stageColors[stage] || 'bg-gray-100 text-gray-800';
  };

  // Sort opportunities
  const sortedOpportunities = [...opportunities].sort((a: any, b: any) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    if (sortField === 'latestSnapshot.amount') {
      aValue = a.latestSnapshot?.amount || 0;
      bValue = b.latestSnapshot?.amount || 0;
    }

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            Sales Opportunities
            {filters.salesRep !== 'all' && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                - {filters.salesRep} ({sortedOpportunities.length} opportunities)
              </span>
            )}
            {filters.salesRep === 'all' && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({sortedOpportunities.length} total opportunities)
              </span>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold"
                    onClick={() => handleSort('name')}
                  >
                    Opportunity Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold"
                    onClick={() => handleSort('clientName')}
                  >
                    Client
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold"
                    onClick={() => handleSort('owner')}
                  >
                    Sales Rep
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold"
                    onClick={() => handleSort('latestSnapshot.amount')}
                  >
                    Value
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Expected Close</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedOpportunities.length > 0 ? (
                sortedOpportunities.map((opportunity: any) => (
                  <TableRow key={opportunity.id}>
                    <TableCell className="font-medium">
                      {opportunity.name}
                    </TableCell>
                    <TableCell>
                      {opportunity.clientName || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-semibold text-green-700">
                            {opportunity.owner?.split(' ').map((n: string) => n[0]).join('') || 'NA'}
                          </span>
                        </div>
                        <span className="text-sm">{opportunity.owner || 'Unassigned'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStageColor(opportunity.latestSnapshot?.stage || 'Unknown')}>
                        {opportunity.latestSnapshot?.stage || 'No Stage'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(opportunity.latestSnapshot?.amount || 0)}
                    </TableCell>
                    <TableCell>
                      {opportunity.latestSnapshot?.expectedCloseDate ? 
                        new Date(opportunity.latestSnapshot.expectedCloseDate).toLocaleDateString() : 
                        'Not set'
                      }
                    </TableCell>
                    <TableCell>
                      {opportunity.latestSnapshot?.snapshotDate ? 
                        new Date(opportunity.latestSnapshot.snapshotDate).toLocaleDateString() : 
                        'No data'
                      }
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No opportunities found for the selected filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}