import { useState } from "react";
import SalesFilterPanel from "@/components/sales/SalesFilterPanel";
import SalesMetricsCards from "@/components/sales/SalesMetricsCards";
import SalesPipelineValueChart from "@/components/sales/SalesPipelineValueChart";
import SalesStageDistributionChart from "@/components/sales/SalesStageDistributionChart";
import SalesFiscalYearPipelineChart from "@/components/sales/SalesFiscalYearPipelineChart";
import SalesOpportunitiesTable from "@/components/sales/SalesOpportunitiesTable";
import SalesSankeyFlowChart from "@/components/sales/SalesSankeyFlowChart";
import SalesStageTimingCard from "@/components/sales/SalesStageTimingCard";
import SalesDuplicateOpportunitiesCard from "@/components/sales/SalesDuplicateOpportunitiesCard";
import SalesDateSlippageCard from "@/components/sales/SalesDateSlippageCard";
import SalesValueChangeCard from "@/components/sales/SalesValueChangeCard";
import SalesClosingProbabilityCard from "@/components/sales/SalesClosingProbabilityCard";
import SalesStageFunnelChart from "@/components/sales/SalesStageFunnelChart";
import SalesWinRateCard from "@/components/sales/SalesWinRateCard";
import SalesCloseRateCard from "@/components/sales/SalesCloseRateCard";
import SalesLossReasonOverview from "@/components/sales/SalesLossReasonOverview";
import SalesLossReasonByStage from "@/components/sales/SalesLossReasonByStage";
import SalesRecentLossesTable from "@/components/sales/SalesRecentLossesTable";
import { Button } from "@/components/ui/button";
import { TrendingUp, Home, Database, Settings, Download } from "lucide-react";
import { SalesFilterState } from "@/types/sales";
import { Link } from "wouter";

export default function SalesAnalytics() {
  const [filters, setFilters] = useState<SalesFilterState>({
    startDate: '',
    endDate: '',
    salesRep: 'all', // Main filter for sales rep
    stages: [],
    minValue: '',
    maxValue: '',
    search: '',
    valueType: 'amount',
    clientName: 'all'
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900">Sales Analytics Dashboard</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <Home className="w-4 h-4 mr-2" />
                  Back to Desktop
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Pipeline Analytics
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
            </div>
          </div>
        </div>
      </header>

      {/* Sales Filter Panel - Collapsible sidebar */}
      <SalesFilterPanel 
        filters={filters} 
        onFiltersChange={setFilters}
      />

      {/* Main Content Area */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 pl-16"> {/* pl-16 accounts for collapsed sidebar */}
        <div className="space-y-6">
          {/* Current Sales Rep Display */}
          {filters.salesRep !== 'all' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {filters.salesRep.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-green-900">
                      Sales Analytics for {filters.salesRep}
                    </h2>
                    <p className="text-sm text-green-700">
                      All metrics and charts below are filtered for this sales representative
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setFilters(prev => ({ ...prev, salesRep: 'all' }))}
                >
                  View All Reps
                </Button>
              </div>
            </div>
          )}

          {/* Key Metrics Cards */}
          <SalesMetricsCards filters={filters} />

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            <SalesPipelineValueChart filters={filters} />
            <SalesFiscalYearPipelineChart filters={filters} />
            <SalesStageDistributionChart filters={filters} />
            <SalesDuplicateOpportunitiesCard filters={filters} />
          </div>

          {/* Advanced Analytics Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            <SalesStageTimingCard filters={filters} />
            <SalesDateSlippageCard filters={filters} />
            <SalesValueChangeCard filters={filters} />
            <SalesClosingProbabilityCard filters={filters} />
          </div>

          {/* Loss Analysis Section */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <SalesLossReasonOverview filters={filters} />
            <div className="lg:col-span-2">
              <SalesLossReasonByStage filters={filters} />
            </div>
            <div className="lg:col-span-1">
              <SalesRecentLossesTable filters={filters} />
            </div>
          </div>

          {/* Stage Flow Analysis - Full Width */}
          <SalesSankeyFlowChart filters={filters} />

          {/* Stage Progression Rates */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <SalesStageFunnelChart filters={filters} />
            </div>
            <div className="lg:col-span-1">
              <SalesWinRateCard filters={filters} />
            </div>
            <div className="lg:col-span-1">
              <SalesCloseRateCard filters={filters} />
            </div>
          </div>

          {/* Detailed Opportunities Table */}
          <SalesOpportunitiesTable filters={filters} />
        </div>
      </div>
    </div>
  );
}