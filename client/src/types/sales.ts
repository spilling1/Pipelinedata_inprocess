export interface SalesFilterState {
  startDate: string;
  endDate: string;
  salesRep: string; // This is the main filter - specific sales rep or 'all'
  stages: string[];
  minValue: string;
  maxValue: string;
  search: string;
  valueType: string;
  clientName: string;
}

export interface SalesOpportunityData {
  id: number;
  name: string;
  clientName?: string;
  owner?: string;
  createdDate?: string;
  latestSnapshot?: {
    stage: string;
    amount: number;
    expectedCloseDate?: string;
    snapshotDate: string;
  };
}

export interface SalesAnalyticsData {
  metrics: {
    totalValue: number;
    activeCount: number;
    avgDealSize: number;
    conversionRate: number;
  };
  pipelineValueByDate: Array<{
    date: string;
    value: number;
  }>;
  stageDistribution: Array<{
    stage: string;
    count: number;
    value: number;
  }>;
  recentMovements: Array<{
    opportunityName: string;
    from: string;
    to: string;
    date: string;
    value: number;
  }>;
}