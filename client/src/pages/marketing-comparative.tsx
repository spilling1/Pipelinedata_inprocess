import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Users, Target, TrendingUp, Trophy } from 'lucide-react';
import TeamAttendeeEffectiveness from '@/components/marketing/TeamAttendeeEffectiveness';
import CampaignEffectivenessRankings from '@/components/marketing/CampaignEffectivenessRankings';
import TargetAccountAnalytics from '@/components/marketing/TargetAccountAnalytics';
import StrategicEngagementMatrix from '@/components/marketing/StrategicEngagementMatrix';
import CampaignTypeAnalysis from '@/components/marketing/CampaignTypeAnalysis';

const MarketingComparativeAnalytics: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketing Comparative Analytics</h1>
          <p className="text-muted-foreground">
            Advanced campaign influence tracking and team performance analysis
          </p>
        </div>
      </div>

      <Tabs defaultValue="team-performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="team-performance" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Performance
          </TabsTrigger>
          <TabsTrigger value="campaign-influence" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Campaign Influence
          </TabsTrigger>
          <TabsTrigger value="campaign-types" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Campaign Types
          </TabsTrigger>
          <TabsTrigger value="target-accounts" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Target Accounts
          </TabsTrigger>
          <TabsTrigger value="strategic-matrix" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Strategic Matrix
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team-performance" className="space-y-6">
          <TeamAttendeeEffectiveness />
        </TabsContent>

        <TabsContent value="campaign-influence" className="space-y-6">
          <CampaignEffectivenessRankings />
        </TabsContent>

        <TabsContent value="campaign-types" className="space-y-6">
          <CampaignTypeAnalysis />
        </TabsContent>

        <TabsContent value="target-accounts" className="space-y-6">
          <TargetAccountAnalytics />
        </TabsContent>

        <TabsContent value="strategic-matrix" className="space-y-6">
          <StrategicEngagementMatrix />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MarketingComparativeAnalytics;