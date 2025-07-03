import { useState } from "react";
import FileUpload from "@/components/FileUpload";
import SalesFilterPanel from "@/components/sales/SalesFilterPanel";
import SalesMetricsCards from "@/components/sales/SalesMetricsCards";
import SalesPipelineValueChart from "@/components/sales/SalesPipelineValueChart";
import SalesStageDistributionChart from "@/components/sales/SalesStageDistributionChart";
import SalesFiscalYearPipelineChart from "@/components/sales/SalesFiscalYearPipelineChart";
import SalesStageTimingCard from "@/components/sales/SalesStageTimingCard";
import SalesDateSlippageCard from "@/components/sales/SalesDateSlippageCard";
import SalesValueChangeCard from "@/components/sales/SalesValueChangeCard";
import SalesClosingProbabilityCard from "@/components/sales/SalesClosingProbabilityCard";
import SalesClosedWonFYCard from "@/components/sales/SalesClosedWonFYCard";
import SalesLossReasonOverview from "@/components/sales/SalesLossReasonOverview";

// Keep some non-sales specific components that can work with FilterState
import OpportunitiesTable from "@/components/OpportunitiesTable";
import SankeyFlowChart from "@/components/SankeyFlowChart";
import DuplicateOpportunitiesCard from "@/components/DuplicateOpportunitiesCard";
import StageFunnelChart from "@/components/StageFunnelChart";
import WinRateCard from "@/components/WinRateCard";
import CloseRateCard from "@/components/CloseRateCard";
import WinRateOverTimeCard from "@/components/WinRateOverTimeCard";
import { CloseRateOverTimeCard } from "@/components/CloseRateOverTimeCard";
import { LossReasonByStage } from "@/components/LossReasonByStage";
import RecentLossesTable from "@/components/RecentLossesTable";
import { Button } from "@/components/ui/button";
import { TrendingUp, Upload, Download, Settings, Database, Home } from "lucide-react";
import { SalesFilterState } from "@/types/sales";
import { FilterState } from "@/types/pipeline";
import { Link } from "wouter";

export default function SalesAnalytics() {
  const [salesFilters, setSalesFilters] = useState<SalesFilterState>({
    startDate: '',
    endDate: '',
    salesRep: 'all',
    stages: [],
    minValue: '',
    maxValue: '',
    search: '',
    valueType: 'amount',
    clientName: 'all'
  });

  // Convert SalesFilterState to FilterState for components that expect FilterState
  const filters: FilterState = {
    startDate: salesFilters.startDate,
    endDate: salesFilters.endDate,
    stages: salesFilters.stages,
    owner: salesFilters.salesRep, // Map salesRep to owner
    minValue: salesFilters.minValue,
    maxValue: salesFilters.maxValue,
    search: salesFilters.search,
    valueType: salesFilters.valueType,
    clientName: salesFilters.clientName
  };

  const [showUpload, setShowUpload] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900">Sales Analytics</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <Home className="w-4 h-4 mr-2" />
                  Back to Desktop
                </Button>
              </Link>
              <Link href="/database">
                <Button variant="outline" size="sm">
                  <Database className="w-4 h-4 mr-2" />
                  Database
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </Link>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
              <Button size="sm" onClick={() => setShowUpload(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Files
              </Button>
            </div>
          </div>
        </div>
      </header>
      {/* Sales Filter Panel - Now a collapsible sidebar */}
      <SalesFilterPanel 
        filters={salesFilters} 
        onFiltersChange={setSalesFilters}
      />
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
            {/* Key Metrics Cards */}
            <SalesMetricsCards filters={salesFilters} />

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
              <SalesPipelineValueChart filters={salesFilters} />
              <SalesFiscalYearPipelineChart filters={salesFilters} />
              <SalesStageDistributionChart filters={salesFilters} />
              <DuplicateOpportunitiesCard filters={filters} />
            </div>

            {/* Advanced Analytics Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-6">
              <SalesStageTimingCard filters={salesFilters} />
              <SalesDateSlippageCard filters={salesFilters} />
              <SalesValueChangeCard filters={salesFilters} />
              <SalesClosingProbabilityCard filters={salesFilters} />
              <SalesClosedWonFYCard filters={salesFilters} />
            </div>

            {/* Loss Analysis Section */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <SalesLossReasonOverview filters={salesFilters} />
              <div className="lg:col-span-2">
                <LossReasonByStage />
              </div>
              <div className="lg:col-span-1">
                <RecentLossesTable />
              </div>
            </div>

            {/* Stage Flow Analysis - Full Width */}
            <SankeyFlowChart filters={filters} />

            {/* Stage Progression Rates */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <StageFunnelChart filters={filters} />
              </div>
              <div className="lg:col-span-1">
                <WinRateCard filters={filters} />
              </div>
              <div className="lg:col-span-1">
                <CloseRateCard filters={filters} />
              </div>
            </div>

            {/* Win Rate and Close Rate Over Time - Each 2/4 width */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-2">
                <WinRateOverTimeCard filters={filters} />
              </div>
              <div className="lg:col-span-2">
                <CloseRateOverTimeCard />
              </div>
            </div>
        </div>
      </div>
      {/* File Upload Modal */}
      {showUpload && (
        <FileUpload onClose={() => setShowUpload(false)} />
      )}
    </div>
  );
}