import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Users, Target, TrendingUp } from 'lucide-react';
import TeamAttendeeEffectiveness from '@/components/marketing/TeamAttendeeEffectiveness';
import CampaignInfluenceAnalytics from '@/components/marketing/CampaignInfluenceAnalytics';

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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="team-performance" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Performance
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
        </TabsList>

        <TabsContent value="team-performance" className="space-y-6">
          <TeamAttendeeEffectiveness />
        </TabsContent>

        <TabsContent value="campaign-influence" className="space-y-6">
          <CampaignInfluenceAnalytics />
        </TabsContent>

        <TabsContent value="target-accounts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Target Account Analysis
              </CardTitle>
              <CardDescription>
                Performance comparison between target accounts and regular prospects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">153</p>
                        <p className="text-sm text-gray-600">Target Accounts</p>
                        <p className="text-xs text-gray-500">$38.5M Pipeline</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">$252K</p>
                        <p className="text-sm text-gray-600">Avg Target Account Deal Size</p>
                        <p className="text-xs text-gray-500">Advantage over regular prospects</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategic-matrix" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Strategic Engagement Matrix
              </CardTitle>
              <CardDescription>
                Optimal strategy recommendations combining target account and attendee analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Strategic Insights</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Optimal attendee count: 3-5 team members for maximum efficiency</li>
                    <li>• Target account engagement shows 714% ROI improvement</li>
                    <li>• Multi-touch campaigns increase close rates by 33.46%</li>
                    <li>• Sales team members consistently outperform across campaign types</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MarketingComparativeAnalytics;