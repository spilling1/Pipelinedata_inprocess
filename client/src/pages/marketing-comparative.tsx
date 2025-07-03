import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, Trophy } from 'lucide-react';
import CampaignTypeAnalysisEnhanced from '@/components/marketing/CampaignTypeAnalysisEnhanced';

const MarketingComparativeAnalytics: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Navigation Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <Home className="h-4 w-4" />
            Dashboard
          </Button>
        </Link>
        <span>/</span>
        <Link href="/marketing-analytics">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Marketing Analytics
          </Button>
        </Link>
        <span>/</span>
        <span className="font-medium text-foreground">Campaign Types</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Campaign Types Analytics
          </h1>
          <p className="text-muted-foreground">
            Comprehensive performance analysis across all campaign types
          </p>
        </div>
      </div>

      <CampaignTypeAnalysisEnhanced />
    </div>
  );
};

export default MarketingComparativeAnalytics;