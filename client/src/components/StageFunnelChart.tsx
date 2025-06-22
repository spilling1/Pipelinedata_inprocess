import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { FilterState } from "@/types/pipeline";

interface StageFunnelChartProps {
  filters: FilterState;
}

interface DealMovement {
  opportunityName: string;
  from: string;
  to: string;
  date: Date;
  value: number;
  opportunityId: string;
  clientName?: string;
}

interface StageProgression {
  stage: string;
  totalDeals: number;
  advancedDeals: number;
  progressionRate: number;
  color: string;
  nextStages: string[];
}

export default function StageFunnelChart({ filters }: StageFunnelChartProps) {
  // Calculate fiscal year date range (FY to Date)
  const dateRange = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-based
    
    // Fiscal year starts February 1st
    const fiscalYearStart = currentMonth >= 1 ? // If February or later
      new Date(currentYear, 1, 1) : // Current year Feb 1
      new Date(currentYear - 1, 1, 1); // Previous year Feb 1
    
    return {
      startDate: fiscalYearStart,
      endDate: now
    };
  }, []);

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['/api/analytics', dateRange.startDate?.toISOString(), dateRange.endDate?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate.toISOString().split('T')[0]);
      }
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate.toISOString().split('T')[0]);
      }
      
      const response = await fetch(`/api/analytics?${params}`);
      if (!response.ok) throw new Error('Failed to fetch analytics data');
      return response.json();
    }
  });

  const stageOrder = [
    'Validation/Introduction',
    'Discover',
    'Developing Champions', 
    'ROI Analysis/Pricing',
    'Negotiation/Review'
  ];

  // Function to get display name for stages
  const getDisplayName = (stage: string): string => {
    // Return the full stage names without shortening
    return stage;
  };

  const getStageColor = (stage: string): string => {
    const colors: Record<string, string> = {
      'Validation/Introduction': '#6B7280', // Gray
      'Discover': '#10B981',
      'Developing Champions': '#F59E0B',
      'ROI Analysis/Pricing': '#8B5CF6',
      'Negotiation/Review': '#EF4444',
      'Closed Won': '#059669',
    };
    return colors[stage] || '#6B7280';
  };

  const funnelData = useMemo(() => {
    if (!analyticsData) return [];

    const recentMovements: DealMovement[] = (analyticsData as any).recentMovements || [];
    
    // Filter movements to only include those within the fiscal year date range
    const filteredMovements = recentMovements.filter(movement => {
      const movementDate = new Date(movement.date);
      return movementDate >= dateRange.startDate && movementDate <= dateRange.endDate;
    });
    
    // Create a map to track all deals that started from each stage
    const stageStartMap = new Map<string, Set<string>>();
    const stageProgressionMap = new Map<string, Set<string>>();
    
    // Track all deals that moved from each stage
    filteredMovements.forEach(movement => {
      const fromStage = movement.from;
      const toStage = movement.to;
      const dealId = movement.opportunityId;
      
      // Skip closed-to-closed movements
      if (fromStage.includes('Closed') && toStage.includes('Closed')) return;
      
      // Only process movements from stages in our stage order
      if (!stageOrder.includes(fromStage)) return;
      
      // Initialize stage tracking
      if (!stageStartMap.has(fromStage)) {
        stageStartMap.set(fromStage, new Set());
      }
      if (!stageProgressionMap.has(fromStage)) {
        stageProgressionMap.set(fromStage, new Set());
      }
      
      // Track deal that started from this stage
      stageStartMap.get(fromStage)!.add(dealId);
      
      // Check if this is a forward progression (not to Closed Lost)
      const fromIndex = stageOrder.indexOf(fromStage);
      const toIndex = stageOrder.indexOf(toStage);
      
      // Count as progression if: 
      // 1. Moving to a later stage in our order, OR
      // 2. Moving to Closed Won (success), OR  
      // 3. Any movement that's not to Closed Lost
      if (toStage !== 'Closed Lost' && (toIndex > fromIndex || toStage === 'Closed Won' || toIndex === -1)) {
        stageProgressionMap.get(fromStage)!.add(dealId);
      }
    });

    // Calculate progression rates for each stage
    const stageData = stageOrder.map(stage => {
      const totalDeals = stageStartMap.get(stage)?.size || 0;
      const advancedDeals = stageProgressionMap.get(stage)?.size || 0;
      const stageProgressionRate = totalDeals > 0 ? (advancedDeals / totalDeals) * 100 : 0;
      
      return {
        stage,
        totalDeals,
        advancedDeals,
        stageProgressionRate,
        color: getStageColor(stage),
        nextStages: []
      };
    });

    // Calculate cumulative progression rates (multiplied)
    return stageData.map((stageInfo, index) => {
      let cumulativeRate = stageInfo.stageProgressionRate;
      
      // For stages after Validation/Introduction, multiply by all previous stage rates (excluding Validation/Introduction)
      if (index > 0) { // Skip Validation/Introduction (index 0)
        // Start with Discover's rate (index 1)
        if (index === 1) {
          cumulativeRate = stageInfo.stageProgressionRate;
        } else {
          // For stages after Discover, multiply by all previous stage rates starting from Discover
          cumulativeRate = stageInfo.stageProgressionRate;
          for (let i = 1; i < index; i++) { // Start from index 1 (Discover)
            cumulativeRate = (cumulativeRate * stageData[i].stageProgressionRate) / 100;
          }
        }
      }
      
      return {
        ...stageInfo,
        progressionRate: cumulativeRate
      };
    });
  }, [analyticsData]);

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Stage Progression Funnel</h3>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxWidth = Math.max(...funnelData.map(d => d.totalDeals));

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ArrowRight className="h-4 w-4 text-blue-600" />
          <CardTitle className="font-semibold tracking-tight text-[24px]">Stage Progression Rates</CardTitle>
        </div>
        <p className="text-sm text-gray-600">Probability of advancing from each stage to later stages</p>
      </CardHeader>
      <CardContent>
        {funnelData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No stage movement data available</p>
            <p className="text-xs text-gray-400">Upload pipeline files to analyze progression rates</p>
          </div>
        ) : (
          <div className="space-y-4">
            {funnelData.map((stage, index) => {
              const widthPercentage = maxWidth > 0 ? (stage.totalDeals / maxWidth) * 100 : 0;
              const progressionPercentage = stage.progressionRate;
              const progressionColor = stage.stage === 'Validation/Introduction' ? 'bg-gray-500' :
                                     progressionPercentage >= 50 ? 'bg-green-500' : 
                                     progressionPercentage >= 25 ? 'bg-yellow-500' : 'bg-red-500';
              
              return (
                <div key={stage.stage} className="space-y-2">
                  {/* Stage header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{getDisplayName(stage.stage)}</h4>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span>{stage.totalDeals} deals</span>
                      <Badge 
                        variant="outline" 
                        className="bg-gray-100 text-gray-600 border-gray-300"
                      >
                        {stage.stageProgressionRate.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="relative">
                    <div className={`w-full rounded-lg h-8 flex items-center justify-center ${stage.stage === 'Validation/Introduction' ? 'bg-gray-200' : 'bg-white'} border border-gray-300`}>
                      <div 
                        className={`${progressionColor} rounded-lg h-8 flex items-center justify-center transition-all duration-300 mx-auto`}
                        style={{ width: `${progressionPercentage}%` }}
                      >
                        <div className="text-white text-xs font-medium">
                          {progressionPercentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            

          </div>
        )}
      </CardContent>
    </Card>
  );
}