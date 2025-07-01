import React, { useState } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { BarChart3, Users, Target, TrendingUp, Trophy, ArrowLeft, Home, Route, PieChart } from 'lucide-react';
import ExecutiveSummary from '@/components/analytics-comparison/ExecutiveSummary';
import TeamAttendeeEffectiveness from '@/components/marketing/TeamAttendeeEffectiveness';
import CampaignEffectivenessRankings from '@/components/marketing/CampaignEffectivenessRankings';
import TargetAccountAnalytics from '@/components/marketing/TargetAccountAnalytics';
import StrategicEngagementMatrix from '@/components/marketing/StrategicEngagementMatrix';
import CampaignTypeAnalysisEnhanced from '@/components/marketing/CampaignTypeAnalysisEnhanced';
import CustomerJourneyAnalysis from '@/components/marketing/CustomerJourneyAnalysis';
import CampaignInfluence from '@/components/analytics-comparison/CampaignInfluence';
import TargetAccountStrategy from '@/components/analytics-comparison/TargetAccountStrategy';
import CustomerJourneyAnalysisSimple from '@/components/analytics-comparison/CustomerJourneyAnalysisSimple';

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
        <span className="font-medium text-foreground">Comparative Analytics</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketing Comparative Analytics</h1>
          <p className="text-muted-foreground">
            Advanced campaign influence tracking and team performance analysis
          </p>
        </div>
      </div>

      <Tabs defaultValue="executive-summary" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="executive-summary" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Executive Summary
          </TabsTrigger>
          <TabsTrigger value="campaign-types" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Campaign Types
          </TabsTrigger>
          <TabsTrigger value="campaign-influence" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Campaign Influence
          </TabsTrigger>
          <TabsTrigger value="target-accounts" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Target Accounts
          </TabsTrigger>
          <TabsTrigger value="strategic-matrix" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Strategic Matrix
          </TabsTrigger>
          <TabsTrigger value="customer-journey" className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            Customer Journey
          </TabsTrigger>
        </TabsList>

        <TabsContent value="executive-summary" className="space-y-6">
          <ExecutiveSummary />
        </TabsContent>

        

        <TabsContent value="campaign-influence" className="space-y-6">
          <CampaignInfluence />
        </TabsContent>

        <TabsContent value="campaign-types" className="space-y-6">
          <CampaignTypeAnalysisEnhanced />
        </TabsContent>

        <TabsContent value="target-accounts" className="space-y-6">
          <TargetAccountStrategy />
        </TabsContent>

        <TabsContent value="strategic-matrix" className="space-y-6">
          <StrategicEngagementMatrix />
        </TabsContent>

        <TabsContent value="customer-journey" className="space-y-6">
          <CustomerJourneyAnalysisSimple />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MarketingComparativeAnalytics;