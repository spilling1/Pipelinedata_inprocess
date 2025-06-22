import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { GitBranch, Users, ArrowRight, TrendingUp } from "lucide-react";

interface StageFlowData {
  nodes: Array<{ id: string; name: string; category: string }>;
  links: Array<{ source: string; target: string; value: number; customers: string[] }>;
}

interface StageFlowCardProps {
  campaignId: number;
  campaignName: string;
  campaignStartDate: string;
}

export default function StageFlowCard({ campaignId, campaignName, campaignStartDate }: StageFlowCardProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("30");

  const timeframeOptions = [
    { value: "30", label: "30 days" },
    { value: "60", label: "60 days" },
    { value: "90", label: "90 days" },
    { value: "all", label: "All time" }
  ];

  const { data: stageFlowData, isLoading, error } = useQuery<StageFlowData>({
    queryKey: [`/api/marketing/campaigns/${campaignId}/stage-flow`, selectedTimeframe],
    queryFn: async () => {
      const params = selectedTimeframe !== "all" ? `?days=${selectedTimeframe}` : "";
      const response = await fetch(`/api/marketing/campaigns/${campaignId}/stage-flow${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch stage flow data');
      }
      return response.json();
    },
    enabled: !!campaignId,
  });

  const getStageColor = (stage: string, category?: string) => {
    if (category === 'won' || stage.includes('Closed Won')) {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }
    if (category === 'lost' || stage.includes('Closed Lost')) {
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
    if (category === 'late' || stage.includes('Negotiation') || stage.includes('ROI')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
    if (category === 'middle' || stage.includes('Developing')) {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    }
    if (category === 'early' || stage.includes('Discover') || stage.includes('Validation')) {
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  };

  const getFlowDirection = (source: string, target: string) => {
    const stageOrder = [
      'Validation/Introduction',
      'Discover',
      'Developing Champions',
      'ROI Analysis/Pricing',
      'Negotiation/Review',
      'Closed Won'
    ];
    
    const sourceIndex = stageOrder.indexOf(source);
    const targetIndex = stageOrder.indexOf(target);
    
    if (target.includes('Closed Lost')) return 'lost';
    if (targetIndex > sourceIndex && sourceIndex !== -1 && targetIndex !== -1) return 'forward';
    if (targetIndex < sourceIndex && sourceIndex !== -1 && targetIndex !== -1) return 'backward';
    return 'lateral';
  };

  const getFlowIcon = (direction: string) => {
    switch (direction) {
      case 'forward': return { icon: TrendingUp, color: 'text-green-600' };
      case 'backward': return { icon: ArrowRight, color: 'text-orange-600' };
      case 'lost': return { icon: ArrowRight, color: 'text-red-600' };
      default: return { icon: ArrowRight, color: 'text-gray-600' };
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Stage Flow Analysis
          </CardTitle>
          <CardDescription>
            Customer stage transitions for: {campaignName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !stageFlowData || stageFlowData.links.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Stage Flow Analysis
          </CardTitle>
          <CardDescription>
            Customer stage transitions for: {campaignName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <GitBranch className="h-12 w-12 mb-4 opacity-50" />
            <p>{error ? 'Error loading stage flow data' : 'No stage transitions found for this timeframe'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { nodes, links } = stageFlowData;
  
  // Calculate total transitions and customers
  const totalTransitions = links.reduce((sum, link) => sum + link.value, 0);
  const uniqueCustomers = new Set(links.flatMap(link => link.customers)).size;

  // Group links by source stage for better visualization
  const linksBySource = links.reduce((acc, link) => {
    if (!acc[link.source]) acc[link.source] = [];
    acc[link.source].push(link);
    return acc;
  }, {} as Record<string, typeof links>);

  // Sort stages by typical pipeline order
  const stageOrder = [
    'Validation/Introduction',
    'Discover',
    'Developing Champions', 
    'ROI Analysis/Pricing',
    'Negotiation/Review',
    'Closed Won',
    'Closed Lost'
  ];

  const sortedSourceStages = Object.keys(linksBySource).sort((a, b) => {
    const aIndex = stageOrder.indexOf(a);
    const bIndex = stageOrder.indexOf(b);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Stage Flow Analysis
        </CardTitle>
        <CardDescription>
          Customer stage transitions from campaign start for: {campaignName}
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
              Transitions: <span className="font-semibold">{totalTransitions}</span>
            </div>
            <div>
              Customers: <span className="font-semibold">{uniqueCustomers}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {sortedSourceStages.map(sourceStage => {
            const sourceLinks = linksBySource[sourceStage];
            const sourceNode = nodes.find(n => n.id === sourceStage);
            
            // Sort target links by value (descending)
            const sortedLinks = [...sourceLinks].sort((a, b) => b.value - a.value);
            
            return (
              <div key={sourceStage} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={`${getStageColor(sourceStage, sourceNode?.category)} font-medium`}
                  >
                    {sourceStage}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    ({sourceLinks.reduce((sum, link) => sum + link.value, 0)} transitions)
                  </span>
                </div>
                
                <div className="ml-4 space-y-2">
                  {sortedLinks.map(link => {
                    const targetNode = nodes.find(n => n.id === link.target);
                    const direction = getFlowDirection(link.source, link.target);
                    const { icon: FlowIcon, color } = getFlowIcon(direction);
                    
                    return (
                      <div key={`${link.source}-${link.target}`} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                        <FlowIcon className={`h-4 w-4 ${color}`} />
                        
                        <div className="flex items-center gap-2 flex-1">
                          <Badge 
                            variant="outline" 
                            className={`${getStageColor(link.target, targetNode?.category)} text-xs`}
                          >
                            {link.target}
                          </Badge>
                          
                          <span className="text-sm font-medium">
                            {link.value} customer{link.value !== 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          {Math.round((link.value / totalTransitions) * 100)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {sourceStage !== sortedSourceStages[sortedSourceStages.length - 1] && (
                  <Separator className="my-4" />
                )}
              </div>
            );
          })}
          
          {totalTransitions === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No stage transitions found for this timeframe</p>
              <p className="text-sm mt-2">Try selecting a longer time period to see more data</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}