import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown, ArrowUp, ArrowDown, Download, Search } from 'lucide-react';

interface CampaignTypeData {
  campaignType: string;
  totalCampaigns: number;
  totalCost: number;
  totalCustomers: number;
  totalPipelineValue: number;
  totalClosedWonValue: number;
  totalOpenOpportunities: number;
  averageWinRate: number;
  averageROI: number;
  costEfficiency: number;
  attendeeEfficiency: number;
}

interface CampaignTypePerformanceTableProps {
  data: CampaignTypeData[];
}

type SortField = keyof CampaignTypeData;
type SortDirection = 'asc' | 'desc';

const CampaignTypePerformanceTable: React.FC<CampaignTypePerformanceTableProps> = ({ data }) => {
  const [sortField, setSortField] = useState<SortField>('averageROI');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Get unique campaign types for filtering
  const campaignTypes = useMemo(() => {
    const types = [...new Set(data.map(item => item.campaignType))];
    return types.sort();
  }, [data]);

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = data;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.campaignType.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.campaignType === filterType);
    }

    // Sort data
    return filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      return sortDirection === 'asc' 
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
  }, [data, sortField, sortDirection, searchTerm, filterType]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatCurrency = (value: number | undefined) => {
    if (!value || value === 0) return '$0';
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const formatPercentage = (value: number | undefined) => {
    if (!value && value !== 0) return '0.0%';
    return `${value.toFixed(1)}%`;
  };

  const formatNumber = (value: number | undefined) => {
    if (!value && value !== 0) return '0';
    return value.toLocaleString();
  };

  const exportToCSV = () => {
    const headers = [
      'Campaign Type', 'Count', 'Total Cost', 'Pipeline Value', 'Closed Won', 
      'Open Opportunities', 'ROI %', 'Win Rate %', 'Pipeline/Cost Ratio', 'Customers'
    ];
    
    const csvData = processedData.map(item => [
      item.campaignType,
      item.totalCampaigns,
      item.totalCost,
      item.totalPipelineValue,
      item.totalClosedWonValue,
      item.totalOpenOpportunities,
      item.averageROI.toFixed(1),
      item.averageWinRate.toFixed(1),
      item.costEfficiency.toFixed(1),
      item.totalCustomers
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'campaign-type-performance.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-4 w-4" /> : 
      <ArrowDown className="h-4 w-4" />;
  };

  const getROIColor = (roi: number) => {
    if (roi >= 500) return 'text-green-600 dark:text-green-400';
    if (roi >= 200) return 'text-blue-600 dark:text-blue-400';
    if (roi >= 100) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getWinRateColor = (winRate: number) => {
    if (winRate >= 30) return 'text-green-600 dark:text-green-400';
    if (winRate >= 20) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Campaign Type Performance Table</CardTitle>
            <CardDescription>
              Detailed metrics for all campaign types with sorting and filtering
            </CardDescription>
          </div>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search campaign types..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {campaignTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="h-12 px-4 text-left align-middle font-medium">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 data-[state=open]:bg-accent"
                    onClick={() => handleSort('campaignType')}
                  >
                    Type
                    <SortIcon field="campaignType" />
                  </Button>
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('totalCampaigns')}
                  >
                    Count
                    <SortIcon field="totalCampaigns" />
                  </Button>
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('totalCost')}
                  >
                    Cost
                    <SortIcon field="totalCost" />
                  </Button>
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('totalPipelineValue')}
                  >
                    Pipeline
                    <SortIcon field="totalPipelineValue" />
                  </Button>
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('totalClosedWonValue')}
                  >
                    Closed Won
                    <SortIcon field="totalClosedWonValue" />
                  </Button>
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('totalOpenOpportunities')}
                  >
                    Open Opps
                    <SortIcon field="totalOpenOpportunities" />
                  </Button>
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('averageROI')}
                  >
                    ROI %
                    <SortIcon field="averageROI" />
                  </Button>
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('averageWinRate')}
                  >
                    Win Rate %
                    <SortIcon field="averageWinRate" />
                  </Button>
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('costEfficiency')}
                  >
                    Pipeline/Cost
                    <SortIcon field="costEfficiency" />
                  </Button>
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('totalCustomers')}
                  >
                    Customers
                    <SortIcon field="totalCustomers" />
                  </Button>
                </th>
              </tr>
            </thead>
            <tbody>
              {processedData.map((item, index) => (
                <tr key={item.campaignType} className="border-b transition-colors hover:bg-muted/50">
                  <td className="p-4 align-middle font-medium">{item.campaignType}</td>
                  <td className="p-4 align-middle">{formatNumber(item.totalCampaigns)}</td>
                  <td className="p-4 align-middle">{formatCurrency(item.totalCost)}</td>
                  <td className="p-4 align-middle">{formatCurrency(item.totalPipelineValue)}</td>
                  <td className="p-4 align-middle">{formatCurrency(item.totalClosedWonValue)}</td>
                  <td className="p-4 align-middle">{formatNumber(item.totalOpenOpportunities)}</td>
                  <td className={`p-4 align-middle font-medium ${getROIColor(item.averageROI)}`}>
                    {formatPercentage(item.averageROI)}
                  </td>
                  <td className={`p-4 align-middle font-medium ${getWinRateColor(item.averageWinRate)}`}>
                    {formatPercentage(item.averageWinRate)}
                  </td>
                  <td className="p-4 align-middle">{item.costEfficiency.toFixed(1)}x</td>
                  <td className="p-4 align-middle">{formatNumber(item.totalCustomers)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {processedData.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No campaign types match your current filters.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CampaignTypePerformanceTable;