import { useState } from "react";
import FileUpload from "@/components/FileUpload";
import FilterPanel from "@/components/FilterPanel";
import MetricsCards from "@/components/MetricsCards";
import PipelineValueChart from "@/components/PipelineValueChart";
import StageDistributionChart from "@/components/StageDistributionChart";
import FiscalYearPipelineChart from "@/components/FiscalYearPipelineChart";
import OpportunitiesTable from "@/components/OpportunitiesTable";

import SankeyFlowChart from "@/components/SankeyFlowChart";
import StageTimingCard from "@/components/StageTimingCard";
import DuplicateOpportunitiesCard from "@/components/DuplicateOpportunitiesCard";

import DateSlippageCard from "@/components/DateSlippageCard";
import ValueChangeCard from "@/components/ValueChangeCard";
import ClosingProbabilityCard from "@/components/ClosingProbabilityCard";
import StageFunnelChart from "@/components/StageFunnelChart";
import WinRateCard from "@/components/WinRateCard";
import CloseRateCard from "@/components/CloseRateCard";
import ClosedWonFYCard from "@/components/ClosedWonFYCard";
import WinRateOverTimeCard from "@/components/WinRateOverTimeCard";
import { CloseRateOverTimeCard } from "@/components/CloseRateOverTimeCard";
import { LossReasonOverview } from "@/components/LossReasonOverview";
import { LossReasonByStage } from "@/components/LossReasonByStage";
import RecentLossesTable from "@/components/RecentLossesTable";
import { Button } from "@/components/ui/button";
import { TrendingUp, Upload, Download, Settings, Database, Home } from "lucide-react";
import { FilterState } from "@/types/pipeline";
import { Link } from "wouter";

export default function Dashboard() {
  const [filters, setFilters] = useState<FilterState>({
    startDate: '',
    endDate: '',
    stages: [],
    owner: 'all',
    minValue: '',
    maxValue: '',
    search: '',
    valueType: 'amount',
    clientName: 'all'
  });

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
                <h1 className="text-xl font-semibold text-gray-900">Pipeline Tracker</h1>
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
      {/* Filter Panel - Now a collapsible sidebar */}
      <FilterPanel 
        filters={filters} 
        onFiltersChange={setFilters}
        onUploadClick={() => setShowUpload(true)}
      />
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
            {/* Key Metrics Cards */}
            <MetricsCards filters={filters} />

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
              <PipelineValueChart filters={filters} />
              <FiscalYearPipelineChart filters={filters} />
              <StageDistributionChart filters={filters} />
              <DuplicateOpportunitiesCard filters={filters} />
            </div>

            {/* Advanced Analytics Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-6">
              <StageTimingCard filters={filters} />
              <DateSlippageCard filters={filters} />
              <ValueChangeCard filters={filters} />
              <ClosingProbabilityCard filters={filters} />
              <ClosedWonFYCard filters={filters} />
            </div>



            {/* Loss Analysis Section */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <LossReasonOverview />
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

            {/* Win Rate Over Time - 2/4 width */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <WinRateOverTimeCard filters={filters} />
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
