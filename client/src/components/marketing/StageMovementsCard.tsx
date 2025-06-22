import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ArrowRight, Users, TrendingUp } from "lucide-react";

interface StageMovement {
  fromStage: string;
  toStage: string;
  count: number;
  customers: Array<{
    customerName: string;
    opportunityId: number;
    transitionDate: string;
  }>;
}

interface NewDeal {
  customerName: string;
  opportunityId: number;
  createdDate: string;
  initialStage: string;
  currentStage: string;
  year1Arr: number | null;
}

interface StageMovementsData {
  movements: StageMovement[];
  newDeals: NewDeal[];
}

interface StageMovementsCardProps {
  campaignId: number;
  campaignName: string;
}

export default function StageMovementsCard({ campaignId, campaignName }: StageMovementsCardProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("30");
  const [openMovements, setOpenMovements] = useState<Set<string>>(new Set());

  const timeframeOptions = [
    { value: "30", label: "30 days" },
    { value: "60", label: "60 days" },
    { value: "90", label: "90 days" },
    { value: "all", label: "All time" }
  ];

  const { data: stageMovementsData, isLoading, error } = useQuery<StageMovementsData>({
    queryKey: [`/api/marketing/campaigns/${campaignId}/stage-movements`, selectedTimeframe],
    queryFn: async () => {
      const params = selectedTimeframe !== "all" ? `?days=${selectedTimeframe}` : "";
      const response = await fetch(`/api/marketing/campaigns/${campaignId}/stage-movements${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch stage movements');
      }
      return response.json();
    },
    enabled: !!campaignId,
  });

  const stageMovements = stageMovementsData?.movements || [];
  const newDeals = stageMovementsData?.newDeals || [];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '$0';
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value.toLocaleString()}`;
    }
  };

  const getStageColor = (stage: string | undefined | null) => {
    if (!stage) return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    if (stage.includes('Closed Won')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (stage.includes('Closed Lost')) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    if (stage.includes('Negotiation') || stage.includes('ROI')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    if (stage.includes('Developing')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  };

  const toggleMovement = (movementKey: string) => {
    const newOpen = new Set(openMovements);
    if (newOpen.has(movementKey)) {
      newOpen.delete(movementKey);
    } else {
      newOpen.add(movementKey);
    }
    setOpenMovements(newOpen);
  };

  const totalMovements = stageMovements.reduce((sum, movement) => sum + movement.count, 0);
  const totalNewDeals = newDeals.length;

  // Calculate metrics based on current stage
  const newDealsValue = newDeals.reduce((sum, deal) => sum + (deal.year1Arr || 0), 0);
  
  const closedWonDeals = newDeals.filter(deal => deal.currentStage === 'Closed Won');
  const closedWonValue = closedWonDeals.reduce((sum, deal) => sum + (deal.year1Arr || 0), 0);
  
  const openPipelineDeals = newDeals.filter(deal => 
    deal.currentStage !== 'Closed Won' && 
    deal.currentStage !== 'Closed Lost'
  );
  const openPipelineValue = openPipelineDeals.reduce((sum, deal) => sum + (deal.year1Arr || 0), 0);

  // Group deals by current stage
  const stageGroups = newDeals.reduce((groups, deal) => {
    const stage = deal.currentStage || 'Unknown';
    if (!groups[stage]) {
      groups[stage] = [];
    }
    groups[stage].push(deal);
    return groups;
  }, {} as Record<string, NewDeal[]>);

  // Define stage order for consistent display
  const stageOrder = [
    'Closed Won',
    'Negotiation/Review',
    'ROI Analysis/Pricing', 
    'Developing Champions',
    'Decision',
    'Validation/Introduction',
    'Closed Lost'
  ];

  // Sort stages by defined order, then alphabetically for any others
  const sortedStages = Object.keys(stageGroups).sort((a, b) => {
    const aIndex = stageOrder.indexOf(a);
    const bIndex = stageOrder.indexOf(b);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Stage Movements & New Deals
          </CardTitle>
          <CardDescription>
            Deal stage transitions and new deals for: {campaignName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || (stageMovements.length === 0 && newDeals.length === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Stage Movements & New Deals
          </CardTitle>
          <CardDescription>
            Deal stage transitions and new deals for: {campaignName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <Users className="h-12 w-12 mb-4 opacity-50" />
            <p>{error ? 'Error loading stage movements' : 'No stage movements or new deals found for this timeframe'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          New Deals Created
        </CardTitle>
        <CardDescription>
          New deals created within timeframe for: {campaignName}
        </CardDescription>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600 dark:text-gray-400">Timeframe:</span>
            <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeframeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-6 text-sm text-gray-600 dark:text-gray-400">
            <div>
              Total New Deals: <span className="font-semibold">{totalNewDeals}</span> ({formatCurrency(newDealsValue)})
            </div>
            <div>
              New Pipeline: <span className="font-semibold">{openPipelineDeals.length}</span> ({formatCurrency(openPipelineValue)})
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {newDeals.length > 0 ? (
            sortedStages.map((stage) => {
              const stageDeals = stageGroups[stage];
              const stageValue = stageDeals.reduce((sum, deal) => sum + (deal.year1Arr || 0), 0);
              const stageKey = `stage-${stage}`;
              const isOpen = openMovements.has(stageKey);
              
              return (
                <Collapsible key={stage} open={isOpen} onOpenChange={() => toggleMovement(stageKey)}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={getStageColor(stage)}>
                          {stage}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {stageDeals.length} deal{stageDeals.length !== 1 ? 's' : ''} • {formatCurrency(stageValue)}
                        </span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="mt-2 ml-3">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Customer</th>
                              <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Starting Stage</th>
                              <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Current Stage</th>
                              <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Year 1 ARR</th>
                              <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Date Created</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stageDeals.map((deal, index) => (
                              <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <td className="py-2 px-3 font-medium">{deal.customerName}</td>
                                <td className="py-2 px-3">
                                  <Badge variant="outline" className={getStageColor(deal.initialStage)}>
                                    {deal.initialStage}
                                  </Badge>
                                </td>
                                <td className="py-2 px-3">
                                  <Badge variant="outline" className={getStageColor(deal.currentStage)}>
                                    {deal.currentStage}
                                  </Badge>
                                </td>
                                <td className="py-2 px-3 font-medium">{formatCurrency(deal.year1Arr)}</td>
                                <td className="py-2 px-3 text-gray-500">{formatDate(deal.createdDate)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No new deals found for this timeframe</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}