import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Download, Filter } from "lucide-react";
import { SalesFilterState } from "@/types/sales";

interface SalesFilterPanelProps {
  filters: SalesFilterState;
  onFiltersChange: (filters: SalesFilterState) => void;
}

export default function SalesFilterPanel({ filters, onFiltersChange }: SalesFilterPanelProps) {
  // Define time period options
  const timePeriods = [
    { id: 'last12months', label: 'Last 12 Months' },
    { id: 'last6months', label: 'Last 6 Months' },
    { id: 'last3months', label: 'Last 3 Months' },
    { id: 'last1month', label: 'Last 1 Month' },
    { id: 'fytodate', label: 'FY to Date' },
    { id: 'monthtodate', label: 'Month to Date' }
  ];

  // Function to calculate date ranges based on period
  const getDateRangeForPeriod = (periodId: string) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    switch (periodId) {
      case 'last12months':
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setFullYear(currentYear - 1);
        return {
          startDate: twelveMonthsAgo.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      case 'last6months':
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(currentMonth - 6);
        return {
          startDate: sixMonthsAgo.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      case 'last3months':
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(currentMonth - 3);
        return {
          startDate: threeMonthsAgo.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      case 'last1month':
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(currentMonth - 1);
        return {
          startDate: oneMonthAgo.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      case 'fytodate':
        // Fiscal year starts Feb 1
        const fyStart = currentMonth >= 1 ? 
          new Date(currentYear, 1, 1) : // Feb 1 this year
          new Date(currentYear - 1, 1, 1); // Feb 1 last year
        return {
          startDate: fyStart.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      case 'monthtodate':
        const monthStart = new Date(currentYear, currentMonth, 1);
        return {
          startDate: monthStart.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      default:
        return {
          startDate: '',
          endDate: ''
        };
    }
  };

  const [selectedTimePeriod, setSelectedTimePeriod] = useState('last3months');
  const [localFilters, setLocalFilters] = useState(() => {
    const defaultDates = getDateRangeForPeriod('last3months');
    return {
      ...filters,
      startDate: filters.startDate || defaultDates.startDate,
      endDate: filters.endDate || defaultDates.endDate
    };
  });
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Fetch available sales reps
  const { data: salesReps = [] } = useQuery({
    queryKey: ['/api/sales/reps'],
    staleTime: 300000, // 5 minutes
  });

  // Fetch available stages
  const { data: stages = [] } = useQuery({
    queryKey: ['/api/sales/stages'],
    staleTime: 300000, // 5 minutes
  });

  // Fetch available clients
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/sales/clients'],
    staleTime: 300000, // 5 minutes
  });

  // Apply filters when local filters change
  useEffect(() => {
    onFiltersChange(localFilters);
  }, [localFilters, onFiltersChange]);

  // Handle time period change
  const handleTimePeriodChange = (periodId: string) => {
    setSelectedTimePeriod(periodId);
    const dateRange = getDateRangeForPeriod(periodId);
    setLocalFilters(prev => ({
      ...prev,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    }));
  };

  // Handle sales rep change
  const handleSalesRepChange = (salesRep: string) => {
    setLocalFilters(prev => ({
      ...prev,
      salesRep
    }));
  };

  // Handle stage selection
  const handleStageChange = (stage: string, checked: boolean) => {
    setLocalFilters(prev => ({
      ...prev,
      stages: checked 
        ? [...prev.stages, stage]
        : prev.stages.filter(s => s !== stage)
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    const defaultDates = getDateRangeForPeriod('last3months');
    setLocalFilters({
      startDate: defaultDates.startDate,
      endDate: defaultDates.endDate,
      salesRep: 'all',
      stages: [],
      minValue: '',
      maxValue: '',
      search: '',
      valueType: 'amount',
      clientName: 'all'
    });
    setSelectedTimePeriod('last3months');
  };

  return (
    <div className={`fixed left-0 top-0 h-full bg-white shadow-lg border-r border-gray-200 transition-all duration-300 z-40 ${
      isCollapsed ? 'w-12' : 'w-80'
    }`}>
      {/* Toggle Button */}
      <div className="absolute -right-3 top-4 z-50">
        <Button
          variant="outline"
          size="sm"
          className="h-6 w-6 p-0 rounded-full bg-white shadow-md"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>
      </div>

      {/* Collapsed State */}
      {isCollapsed && (
        <div className="p-2 pt-16">
          <div className="flex flex-col items-center space-y-3">
            <Filter className="h-5 w-5 text-gray-400" />
            <span className="text-xs text-gray-500 transform -rotate-90 whitespace-nowrap">Filters</span>
          </div>
        </div>
      )}

      {/* Expanded State */}
      {!isCollapsed && (
        <div className="p-4 pt-16 h-full overflow-y-auto">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Sales Analytics Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sales Rep Filter - Primary Filter */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Label className="text-sm font-semibold text-blue-900">Sales Representative</Label>
                <Select value={localFilters.salesRep} onValueChange={handleSalesRepChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select sales rep" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sales Reps</SelectItem>
                    {salesReps.map((rep: any) => (
                      <SelectItem key={rep.owner} value={rep.owner}>
                        {rep.owner} ({rep.count} opportunities)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Time Period */}
              <div>
                <Label className="text-sm font-medium">Time Period</Label>
                <Select value={selectedTimePeriod} onValueChange={handleTimePeriodChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timePeriods.map(period => (
                      <SelectItem key={period.id} value={period.id}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Range */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-sm font-medium">Start Date</Label>
                  <Input
                    type="date"
                    value={localFilters.startDate}
                    onChange={(e) => setLocalFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">End Date</Label>
                  <Input
                    type="date"
                    value={localFilters.endDate}
                    onChange={(e) => setLocalFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Stages */}
              <div>
                <Label className="text-sm font-medium">Sales Stages</Label>
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                  {stages.map((stage: any) => (
                    <div key={stage.stage} className="flex items-center space-x-2">
                      <Checkbox
                        id={`stage-${stage.stage}`}
                        checked={localFilters.stages.includes(stage.stage)}
                        onCheckedChange={(checked) => handleStageChange(stage.stage, checked as boolean)}
                      />
                      <Label htmlFor={`stage-${stage.stage}`} className="text-sm">
                        {stage.stage} ({stage.count})
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Value Range */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-sm font-medium">Min Value</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={localFilters.minValue}
                    onChange={(e) => setLocalFilters(prev => ({ ...prev, minValue: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Max Value</Label>
                  <Input
                    type="number"
                    placeholder="1000000"
                    value={localFilters.maxValue}
                    onChange={(e) => setLocalFilters(prev => ({ ...prev, maxValue: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Client Name */}
              <div>
                <Label className="text-sm font-medium">Client</Label>
                <Select value={localFilters.clientName} onValueChange={(value) => setLocalFilters(prev => ({ ...prev, clientName: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients.map((client: any) => (
                      <SelectItem key={client.clientName} value={client.clientName}>
                        {client.clientName} ({client.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div>
                <Label className="text-sm font-medium">Search Opportunities</Label>
                <Input
                  placeholder="Search by name..."
                  value={localFilters.search}
                  onChange={(e) => setLocalFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="mt-1"
                />
              </div>

              {/* Value Type */}
              <div>
                <Label className="text-sm font-medium">Value Type</Label>
                <Select value={localFilters.valueType} onValueChange={(value) => setLocalFilters(prev => ({ ...prev, valueType: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amount">Amount</SelectItem>
                    <SelectItem value="year1Value">Year 1 ARR</SelectItem>
                    <SelectItem value="tcv">Total Contract Value</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 space-y-2">
                <Button onClick={clearFilters} variant="outline" className="w-full">
                  Clear All Filters
                </Button>
                <Button variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}