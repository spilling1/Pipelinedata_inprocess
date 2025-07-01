import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpDown, Search, Download, Filter } from 'lucide-react';
import type { CampaignInfluenceData } from '../hooks/useCampaignInfluenceData';

interface CampaignInfluenceTableProps {
  campaigns: CampaignInfluenceData[];
}

type SortField = 'name' | 'type' | 'roi' | 'pipeline' | 'closedWon' | 'winRate' | 'customers' | 'cost' | 'efficiency';
type SortDirection = 'asc' | 'desc';

const CampaignInfluenceTable: React.FC<CampaignInfluenceTableProps> = ({ campaigns }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('roi');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  // Get unique campaign types for filter
  const campaignTypes = useMemo(() => {
    const types = Array.from(new Set(campaigns.map(c => c.campaignType))).sort();
    return types;
  }, [campaigns]);

  // Filter and sort campaigns
  const filteredAndSortedCampaigns = useMemo(() => {
    let filtered = campaigns.filter(campaign => {
      const matchesSearch = campaign.campaignName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          campaign.campaignType.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || campaign.campaignType === typeFilter;
      
      return matchesSearch && matchesType;
    });

    // Sort campaigns
    filtered.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case 'name':
          aValue = a.campaignName;
          bValue = b.campaignName;
          break;
        case 'type':
          aValue = a.campaignType;
          bValue = b.campaignType;
          break;
        case 'roi':
          aValue = a.metrics.roi;
          bValue = b.metrics.roi;
          break;
        case 'pipeline':
          aValue = a.metrics.pipelineValue;
          bValue = b.metrics.pipelineValue;
          break;
        case 'closedWon':
          aValue = a.metrics.closedWonValue;
          bValue = b.metrics.closedWonValue;
          break;
        case 'winRate':
          aValue = a.metrics.winRate;
          bValue = b.metrics.winRate;
          break;
        case 'customers':
          aValue = a.metrics.totalCustomers;
          bValue = b.metrics.totalCustomers;
          break;
        case 'cost':
          aValue = a.cost;
          bValue = b.cost;
          break;
        case 'efficiency':
          aValue = a.metrics.pipelineEfficiency;
          bValue = b.metrics.pipelineEfficiency;
          break;
        default:
          aValue = a.metrics.roi;
          bValue = b.metrics.roi;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortDirection === 'asc' 
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

    return filtered;
  }, [campaigns, searchTerm, typeFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedCampaigns.length / itemsPerPage);
  const paginatedCampaigns = filteredAndSortedCampaigns.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Campaign Name',
      'Type',
      'ROI %',
      'Pipeline',
      'Closed Won',
      'Win Rate %',
      'Customers',
      'Cost',
      'Pipeline Efficiency'
    ];

    const csvData = filteredAndSortedCampaigns.map(campaign => [
      campaign.campaignName,
      campaign.campaignType,
      campaign.metrics.roi.toFixed(1),
      campaign.metrics.pipelineValue,
      campaign.metrics.closedWonValue,
      campaign.metrics.winRate.toFixed(1),
      campaign.metrics.totalCustomers,
      campaign.cost,
      campaign.metrics.pipelineEfficiency.toFixed(1)
    ]);

    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'campaign-influence-analysis.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getPerformanceColor = (roi: number) => {
    if (roi >= 500) return 'text-green-600 bg-green-50';
    if (roi >= 200) return 'text-blue-600 bg-blue-50';
    if (roi >= 100) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3" />
      </div>
    </TableHead>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Campaign Influence Analysis</CardTitle>
            <CardDescription>
              Detailed metrics for all campaigns with sorting and filtering
            </CardDescription>
          </div>
          <Button onClick={handleExportCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {campaignTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Badge variant="secondary">
            {filteredAndSortedCampaigns.length} campaigns
          </Badge>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader field="name">Campaign</SortableHeader>
                <SortableHeader field="type">Type</SortableHeader>
                <SortableHeader field="roi">ROI %</SortableHeader>
                <SortableHeader field="pipeline">Pipeline</SortableHeader>
                <SortableHeader field="closedWon">Closed Won</SortableHeader>
                <SortableHeader field="winRate">Win Rate %</SortableHeader>
                <SortableHeader field="customers">Customers</SortableHeader>
                <SortableHeader field="cost">Cost</SortableHeader>
                <SortableHeader field="efficiency">Efficiency</SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCampaigns.map((campaign) => (
                <TableRow key={campaign.campaignId}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-medium">{campaign.campaignName}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(campaign.startDate).toLocaleDateString()}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{campaign.campaignType}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-md text-sm font-medium ${getPerformanceColor(campaign.metrics.roi)}`}>
                      {formatPercentage(campaign.metrics.roi)}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(campaign.metrics.pipelineValue)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(campaign.metrics.closedWonValue)}
                  </TableCell>
                  <TableCell>{formatPercentage(campaign.metrics.winRate)}</TableCell>
                  <TableCell>{campaign.metrics.totalCustomers}</TableCell>
                  <TableCell>{formatCurrency(campaign.cost)}</TableCell>
                  <TableCell>{campaign.metrics.pipelineEfficiency.toFixed(1)}x</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedCampaigns.length)} of {filteredAndSortedCampaigns.length} campaigns
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CampaignInfluenceTable;