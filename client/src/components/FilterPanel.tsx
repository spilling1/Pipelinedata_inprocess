import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, CheckCircle, FileSpreadsheet, Trash2, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { FilterState } from "@/types/pipeline";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onUploadClick: () => void;
}

export default function FilterPanel({ filters, onFiltersChange, onUploadClick }: FilterPanelProps) {
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
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: uploadedFiles } = useQuery({
    queryKey: ['/api/files'],
    // Removed aggressive polling - files are uploaded periodically, not continuously
    refetchOnWindowFocus: true, // Refresh when user returns to the tab
  });

  const { data: opportunities } = useQuery({
    queryKey: ['/api/opportunities'],
  });

  const clearDataMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', '/api/data'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      queryClient.invalidateQueries({ queryKey: ['/api/opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      toast({
        title: "Data cleared",
        description: "All uploaded files and data have been cleared successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to clear data",
        description: error.message || "An error occurred while clearing data.",
        variant: "destructive"
      });
    }
  });

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/export/opportunity-stage-history', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to export CSV');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'opportunity-stage-history.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "CSV exported",
        description: "Opportunity stage history has been exported successfully."
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "An error occurred while exporting data.",
        variant: "destructive"
      });
    }
  };

  // Get unique owners, stages, and clients for filter options
  const uniqueOwners = opportunities ? 
    Array.from(new Set((opportunities as any[]).map((opp: any) => opp.owner).filter(Boolean))) : [];
  
  const uniqueStages = opportunities ? 
    Array.from(new Set((opportunities as any[]).map((opp: any) => opp.latestSnapshot?.stage).filter(Boolean))) : [];

  const uniqueClients = opportunities ? 
    Array.from(new Set((opportunities as any[]).map((opp: any) => opp.clientName).filter(Boolean))) : [];

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Apply default date filters on component mount
  useEffect(() => {
    const defaultDates = getDateRangeForPeriod('last3months');
    if (!filters.startDate && !filters.endDate) {
      const filtersWithDefaults = {
        ...localFilters,
        startDate: defaultDates.startDate,
        endDate: defaultDates.endDate
      };
      onFiltersChange(filtersWithDefaults);
    }
  }, []); // Only run on mount

  const handleTimePeriodChange = (periodId: string) => {
    setSelectedTimePeriod(periodId);
    const dateRange = getDateRangeForPeriod(periodId);
    const updatedFilters = {
      ...localFilters,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    };
    setLocalFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    const updatedFilters = { ...localFilters, [key]: value };
    setLocalFilters(updatedFilters);
  };

  const handleStageToggle = (stage: string, checked: boolean) => {
    const currentStages = localFilters.stages || [];
    const updatedStages = checked 
      ? [...currentStages, stage]
      : currentStages.filter(s => s !== stage);
    
    handleFilterChange('stages', updatedStages);
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
  };

  const resetFilters = () => {
    const emptyFilters: FilterState = {
      startDate: '',
      endDate: '',
      stages: [],
      owner: 'all',
      minValue: '',
      maxValue: '',
      search: '',
      valueType: 'amount',
      clientName: 'all'
    };
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  return (
    <div className="relative">
      {/* Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        className={`fixed top-4 left-4 z-50 transition-all duration-300 ${
          isCollapsed ? 'translate-x-0' : 'translate-x-80'
        }`}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </Button>

      {/* Collapsible Panel */}
      <div
        className={`fixed left-0 top-0 h-screen w-80 bg-background border-r shadow-lg z-40 transition-transform duration-300 overflow-y-auto ${
          isCollapsed ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        <Card className="h-full border-0 rounded-none">
          <CardHeader className="pt-16">
            <CardTitle className="text-lg">Filters & Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pb-8">
        {/* File Upload Section */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Upload Pipeline Files</Label>
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary transition-colors cursor-pointer"
            onClick={onUploadClick}
          >
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Drop Excel files here or click to browse</p>
            <p className="text-xs text-gray-500 mt-1">Supports .xlsx format</p>
          </div>
          
          {/* Uploaded Files Status */}
          {uploadedFiles && Array.isArray(uploadedFiles) && uploadedFiles.length > 0 && (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {uploadedFiles.slice(0, 5).map((file: any) => (
                <div key={file.id} className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                  <div className="flex items-center space-x-2">
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-800 truncate">{file.filename}</span>
                  </div>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
              ))}
              {uploadedFiles.length > 5 && (
                <p className="text-xs text-gray-500 text-center">
                  +{uploadedFiles.length - 5} more files
                </p>
              )}
            </div>
          )}
        </div>

        {/* Data Export Section */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Export Data</Label>
          <Button 
            onClick={handleExportCSV}
            className="w-full flex items-center gap-2"
            variant="outline"
          >
            <Download className="w-4 h-4" />
            Export Stage History CSV
          </Button>
          <p className="text-xs text-gray-500">
            Download opportunity stage history with timestamps, days in each stage, and loss reasons
          </p>
        </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
