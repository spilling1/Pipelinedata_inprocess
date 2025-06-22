export interface FilterState {
  startDate: string;
  endDate: string;
  stages: string[];
  owner: string;
  minValue: string;
  maxValue: string;
  search: string;
  valueType: string;
  clientName: string;
}

export interface OpportunityData {
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

export interface AnalyticsData {
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

export interface UploadResult {
  filename: string;
  recordCount?: number;
  snapshotDate?: string;
  status: 'success' | 'error';
  error?: string;
}

export interface UploadedFile {
  id: number;
  filename: string;
  uploadDate: string;
  snapshotDate?: string;
  recordCount: number;
  status: string;
}
