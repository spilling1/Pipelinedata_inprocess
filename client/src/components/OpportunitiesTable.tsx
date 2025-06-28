import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, ChevronUp, ChevronDown, MoreHorizontal, Target } from "lucide-react";
import { FilterState } from "@/types/pipeline";

interface OpportunitiesTableProps {
  filters: FilterState;
}

export default function OpportunitiesTable({ filters }: OpportunitiesTableProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortField, setSortField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Debounce search input to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Memoize query params to avoid recreating on every render
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && (Array.isArray(value) ? value.length > 0 : true)) {
        if (Array.isArray(value)) {
          params.append(key, value.join(','));
        } else {
          params.append(key, value.toString());
        }
      }
    });
    
    if (debouncedSearch) {
      params.append('search', debouncedSearch);
    }
    
    return params;
  }, [filters, debouncedSearch]);

  const { data: opportunities, isLoading } = useQuery({
    queryKey: ['/api/opportunities', queryParams.toString()],
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Memoize currency formatter for better performance
  const formatCurrency = useMemo(() => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return (value: number) => formatter.format(value);
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Memoize stage color mapping for performance
  const getStageColor = useMemo(() => {
    const stageColors: { [key: string]: string } = {
      'Prospecting': 'bg-gray-100 text-gray-800',
      'Qualification': 'bg-yellow-100 text-yellow-800',
      'Proposal': 'bg-blue-100 text-blue-800',
      'Negotiation': 'bg-green-100 text-green-800',
      'Closed Won': 'bg-emerald-100 text-emerald-800',
      'Closed Lost': 'bg-red-100 text-red-800',
    };
    return (stage: string) => stageColors[stage] || 'bg-gray-100 text-gray-800';
  }, []);

  const calculateDaysInStage = (snapshotDate: string) => {
    const now = new Date();
    const snapshot = new Date(snapshotDate);
    const diffTime = Math.abs(now.getTime() - snapshot.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Sort opportunities (memoized for performance)
  const sortedOpportunities = useMemo(() => {
    const baseOpportunities = opportunities || [];
    if (!sortField) return baseOpportunities;
    
    return [...baseOpportunities].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'value':
          aValue = a.latestSnapshot?.amount || 0;
          bValue = b.latestSnapshot?.amount || 0;
          break;
        case 'closeDate':
          aValue = a.latestSnapshot?.expectedCloseDate ? new Date(a.latestSnapshot.expectedCloseDate).getTime() : 0;
          bValue = b.latestSnapshot?.expectedCloseDate ? new Date(b.latestSnapshot.expectedCloseDate).getTime() : 0;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [opportunities, sortField, sortDirection]);

  const SortButton = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <button
      className="flex items-center space-x-1 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
      onClick={() => handleSort(field)}
    >
      <span>{children}</span>
      {sortField === field && (
        sortDirection === "asc" ? 
          <ChevronUp className="w-4 h-4" /> : 
          <ChevronDown className="w-4 h-4" />
      )}
    </button>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
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
          <CardTitle>Pipeline Opportunities</CardTitle>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Search opportunities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortButton field="name">Opportunity Name</SortButton>
                </TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>
                  <SortButton field="value">Value</SortButton>
                </TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>
                  <SortButton field="closeDate">Close Date</SortButton>
                </TableHead>
                <TableHead>Days in Stage</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedOpportunities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    <div>
                      <p className="text-lg font-medium mb-2">No opportunities found</p>
                      <p className="text-sm">Upload pipeline files or adjust your filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedOpportunities.map((opportunity: any) => (
                  <TableRow key={opportunity.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{opportunity.name}</div>
                        {opportunity.createdDate && (
                          <div className="text-sm text-gray-500">
                            Created: {formatDate(opportunity.createdDate)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{opportunity.clientName || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className={getStageColor(opportunity.latestSnapshot?.stage || 'Unknown')}
                      >
                        {opportunity.latestSnapshot?.stage || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(opportunity.latestSnapshot?.amount || 0)}
                    </TableCell>
                    <TableCell>{opportunity.owner || 'N/A'}</TableCell>
                    <TableCell>
                      {formatDate(opportunity.latestSnapshot?.expectedCloseDate)}
                    </TableCell>
                    <TableCell>
                      {opportunity.latestSnapshot?.snapshotDate ? 
                        calculateDaysInStage(opportunity.latestSnapshot.snapshotDate) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" className="text-primary hover:text-primary-dark">
                          View
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">1</span> to{" "}
            <span className="font-medium">{Math.min(sortedOpportunities.length, 20)}</span> of{" "}
            <span className="font-medium">{sortedOpportunities.length}</span> results
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button size="sm">1</Button>
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
