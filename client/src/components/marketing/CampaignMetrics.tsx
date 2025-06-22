import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CampaignMetricsProps {
  campaignId: number;
  campaignCost?: number;
}

interface MetricsData {
  closedWonValue: number;
  closedWonCount: number;
  openOpportunities: number;
  startingOpportunities: number;
  pipelineValue: number;
  startingPipelineValue: number;
  winRate: number;
  closeRate: number;
  cac: number | null;
}

export default function CampaignMetrics({ campaignId, campaignCost }: CampaignMetricsProps) {
  const [metrics, setMetrics] = React.useState<MetricsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🚀 Fetching metrics for campaign:', campaignId);
        
        // Direct fetch to ensure we hit the right endpoint
        const response = await fetch(`/api/marketing/campaigns/${campaignId}/analytics`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('📡 Analytics response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch analytics: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📊 Raw analytics data received:', data);
        
        // Calculate metrics from the raw data
        const calculatedMetrics: MetricsData = {
          closedWonValue: data.currentClosedWon?.value || 0,
          closedWonCount: data.currentClosedWon?.count || 0,
          openOpportunities: data.currentOpenOpportunities?.count || 0,
          startingOpportunities: data.startingOpportunities || 0,
          pipelineValue: data.currentOpenOpportunities?.value || 0,
          startingPipelineValue: data.startingPipelineValue || 0,
          winRate: data.currentWinRate || 0,
          closeRate: data.closeRate || 0,
          cac: data.cac
        };
        
        console.log('🧮 Calculated metrics:', calculatedMetrics);
        setMetrics(calculatedMetrics);
        
      } catch (err) {
        console.error('❌ Error fetching analytics:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    if (campaignId) {
      fetchMetrics();
    }
  }, [campaignId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">...</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="col-span-full">
          <CardContent className="pt-6">
            <div className="text-red-500">Error loading metrics: {error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="col-span-full">
          <CardContent className="pt-6">
            <div>No metrics data available</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {/* Closed Won */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Closed Won</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${metrics.closedWonValue.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            {metrics.closedWonCount} customers
          </p>
        </CardContent>
      </Card>

      {/* Opportunities */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.openOpportunities}</div>
          <p className="text-xs text-muted-foreground">
            Started: {metrics.startingOpportunities}
          </p>
        </CardContent>
      </Card>

      {/* Pipeline Value */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Pipeline Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${metrics.pipelineValue.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Started: ${metrics.startingPipelineValue.toLocaleString()}
          </p>
        </CardContent>
      </Card>

      {/* Win Rate */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Win Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(metrics.winRate * 100).toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">
            Close Rate: {(metrics.closeRate * 100).toFixed(1)}%
          </p>
        </CardContent>
      </Card>

      {/* CAC */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">CAC</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.cac ? `$${Math.round(metrics.cac).toLocaleString()}` : 'N/A'}
          </div>
          <p className="text-xs text-muted-foreground">
            Cost per acquisition
          </p>
        </CardContent>
      </Card>
    </div>
  );
}