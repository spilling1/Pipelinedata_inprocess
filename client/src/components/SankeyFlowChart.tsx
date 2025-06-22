import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { ArrowRight, ChevronDown, ChevronRight, GitBranch, Calendar } from "lucide-react";
import { FilterState } from "@/types/pipeline";
import { format } from "date-fns";

interface SankeyFlowChartProps {
  filters: FilterState;
}

interface FlowData {
  startStage: string;
  endStage: string;
  count: number;
  value: number;
  movements: DealMovement[];
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

export default function SankeyFlowChart({ filters }: SankeyFlowChartProps) {
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [expandedFlows, setExpandedFlows] = useState<Set<string>>(new Set());
  const [timePeriod, setTimePeriod] = useState("FY to Date");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();

  const dateRange = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-based
    
    // Fiscal year starts February 1st
    const fiscalYearStart = currentMonth >= 1 ? // If February or later
      new Date(currentYear, 1, 1) : // Current year Feb 1
      new Date(currentYear - 1, 1, 1); // Previous year Feb 1
    
    const fiscalYearEnd = currentMonth >= 1 ? 
      new Date(currentYear + 1, 0, 31) : // Next year Jan 31
      new Date(currentYear, 0, 31); // Current year Jan 31

    // Fiscal quarter calculation
    const getFiscalQuarter = (date: Date) => {
      const month = date.getMonth();
      if (month >= 1 && month <= 3) return 1; // Feb-Apr
      if (month >= 4 && month <= 6) return 2; // May-Jul  
      if (month >= 7 && month <= 9) return 3; // Aug-Oct
      return 4; // Nov-Jan
    };

    const currentFQ = getFiscalQuarter(now);
    const fiscalQuarterStart = (() => {
      if (currentFQ === 1) return new Date(currentYear, 1, 1); // Feb 1
      if (currentFQ === 2) return new Date(currentYear, 4, 1); // May 1
      if (currentFQ === 3) return new Date(currentYear, 7, 1); // Aug 1
      return new Date(currentYear, 10, 1); // Nov 1
    })();

    const lastFQStart = (() => {
      if (currentFQ === 1) return new Date(currentYear - 1, 10, 1); // Nov 1
      if (currentFQ === 2) return new Date(currentYear, 1, 1); // Feb 1
      if (currentFQ === 3) return new Date(currentYear, 4, 1); // May 1
      return new Date(currentYear, 7, 1); // Aug 1
    })();

    const lastFQEnd = (() => {
      if (currentFQ === 1) return new Date(currentYear, 0, 31); // Jan 31
      if (currentFQ === 2) return new Date(currentYear, 3, 30); // Apr 30
      if (currentFQ === 3) return new Date(currentYear, 6, 31); // Jul 31
      return new Date(currentYear, 9, 31); // Oct 31
    })();

    switch (timePeriod) {
      case "Last 1 Month":
        return {
          startDate: new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()),
          endDate: now
        };
      case "Last 3 months":
        return {
          startDate: new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()),
          endDate: now
        };
      case "Last 6 months":
        return {
          startDate: new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()),
          endDate: now
        };
      case "Last 12 months":
        return {
          startDate: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
          endDate: now
        };
      case "Month to Date":
        return {
          startDate: new Date(now.getFullYear(), now.getMonth(), 1),
          endDate: now
        };
      case "FQ to Date":
        return {
          startDate: fiscalQuarterStart,
          endDate: now
        };
      case "FY to Date":
        return {
          startDate: fiscalYearStart,
          endDate: now
        };
      case "Last FQ":
        return {
          startDate: lastFQStart,
          endDate: lastFQEnd
        };
      case "Last FY":
        const lastFYStart = new Date(fiscalYearStart.getFullYear() - 1, 1, 1);
        const lastFYEnd = new Date(fiscalYearStart.getFullYear(), 0, 31);
        return {
          startDate: lastFYStart,
          endDate: lastFYEnd
        };
      case "Custom":
        return {
          startDate: customStartDate,
          endDate: customEndDate
        };
      default:
        return {
          startDate: fiscalYearStart,
          endDate: now
        };
    }
  }, [timePeriod, customStartDate, customEndDate]);

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['/api/analytics', filters, dateRange.startDate?.toISOString(), dateRange.endDate?.toISOString()],
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Stage Flow Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const recentMovements: DealMovement[] = (analyticsData as any)?.recentMovements || [];

  // Group movements by stage flow
  const flowMap = new Map<string, {
    startStage: string;
    endStage: string;
    count: number;
    value: number;
    movements: DealMovement[];
  }>();

  recentMovements.forEach(movement => {
    // Include meaningful stage transitions:
    // 1. Active stage to active stage transitions
    // 2. Active stage to closed stage transitions (outcomes)
    // Exclude: Closed to closed transitions (not meaningful)
    const fromClosed = movement.from.includes('Closed');
    const toClosed = movement.to.includes('Closed');
    
    // Skip closed-to-closed movements as they're not meaningful
    if (fromClosed && toClosed) return;
    
    const flowKey = `${movement.from}->${movement.to}`;
    if (!flowMap.has(flowKey)) {
      flowMap.set(flowKey, {
        startStage: movement.from,
        endStage: movement.to,
        count: 0,
        value: 0,
        movements: []
      });
    }
    const flow = flowMap.get(flowKey)!;
    flow.count++;
    flow.value += movement.value;
    flow.movements.push(movement);
  });

  // Group by starting stage
  const stageGroups = new Map<string, Array<{
    endStage: string;
    count: number;
    value: number;
    movements: DealMovement[];
  }>>();

  [...flowMap.values()].forEach(flow => {
    if (!stageGroups.has(flow.startStage)) {
      stageGroups.set(flow.startStage, []);
    }
    stageGroups.get(flow.startStage)!.push({
      endStage: flow.endStage,
      count: flow.count,
      value: flow.value,
      movements: flow.movements
    });
  });

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value.toFixed(0)}`;
    }
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };

  const toggleStageExpansion = (stageName: string) => {
    const newExpanded = new Set(expandedStages);
    if (newExpanded.has(stageName)) {
      newExpanded.delete(stageName);
    } else {
      newExpanded.add(stageName);
    }
    setExpandedStages(newExpanded);
  }

  const toggleFlowExpansion = (flowKey: string) => {
    const newExpanded = new Set(expandedFlows);
    if (newExpanded.has(flowKey)) {
      newExpanded.delete(flowKey);
    } else {
      newExpanded.add(flowKey);
    }
    setExpandedFlows(newExpanded);
  };

  const getStageColor = (stage: string): string => {
    const stageColors: Record<string, string> = {
      'Validation/Introduction': '#F59E0B', // Amber - Early stage
      'Discover': '#3B82F6',              // Blue - Discovery
      'Developing Champions': '#10B981',   // Green - Building relationships
      'ROI Analysis/Pricing': '#8B5CF6',   // Purple - Analysis phase
      'Negotiation/Review': '#F97316',     // Orange - Active negotiation
      'Closed Won': '#22C55E',             // Bright Green - Success
      'Closed Lost': '#EF4444'             // Red - Lost deals
    };
    return stageColors[stage] || '#6B7280'; // Gray fallback
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-blue-600" />
            <CardTitle>Stage Flow Analysis</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Select value={timePeriod} onValueChange={setTimePeriod}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Last 1 Month">Last 1 Month</SelectItem>
                  <SelectItem value="Last 3 months">Last 3 months</SelectItem>
                  <SelectItem value="Last 6 months">Last 6 months</SelectItem>
                  <SelectItem value="Last 12 months">Last 12 months</SelectItem>
                  <SelectItem value="Month to Date">Month to Date</SelectItem>
                  <SelectItem value="FQ to Date">FQ to Date</SelectItem>
                  <SelectItem value="FY to Date">FY to Date</SelectItem>
                  <SelectItem value="Last FQ">Last FQ</SelectItem>
                  <SelectItem value="Last FY">Last FY</SelectItem>
                  <SelectItem value="Custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              
              {timePeriod === "Custom" && (
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8">
                        <Calendar className="h-3 w-3 mr-1" />
                        {customStartDate ? format(customStartDate, "MMM dd") : "Start"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={customStartDate}
                        onSelect={setCustomStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8">
                        <Calendar className="h-3 w-3 mr-1" />
                        {customEndDate ? format(customEndDate, "MMM dd") : "End"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
            <Badge variant="outline" className="text-blue-600 border-blue-200">
              {recentMovements.length} Recent Movements
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {stageGroups.size === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <GitBranch className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No recent stage movements detected</p>
            <p className="text-xs text-gray-400">Upload pipeline files to analyze deal flow patterns</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Left Column: Flow Breakdown by Starting Stage - 1/4 width */}
            <div className="lg:col-span-1">
              <h4 className="font-semibold text-gray-900 mb-3">Flow Breakdown by Starting Stage</h4>
              <div className="space-y-3">
                {Array.from(stageGroups.entries())
                  .sort(([,a], [,b]) => b.reduce((sum, f) => sum + f.count, 0) - a.reduce((sum, f) => sum + f.count, 0))
                  .map(([startStage, flows]) => {
                const totalCount = flows.reduce((sum, f) => sum + f.count, 0);
                const totalValue = flows.reduce((sum, f) => sum + f.value, 0);
                const isExpanded = expandedStages.has(startStage);
                
                return (
                  <div key={startStage} className="border rounded-lg">
                    <Button
                      variant="ghost"
                      className="w-full p-4 h-auto justify-between hover:bg-gray-50"
                      onClick={() => toggleStageExpansion(startStage)}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getStageColor(startStage) }}
                        />
                        <div className="text-left">
                          <div className="font-medium text-gray-900">{startStage}</div>
                          <div className="text-sm text-gray-500">
                            {totalCount} movements • {formatCurrency(totalValue)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {flows.length} destinations
                        </Badge>
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </div>
                    </Button>
                    
                    {isExpanded && (
                      <div className="border-t bg-gray-50 p-3 space-y-2">
                        {flows.map((flow, index) => {
                          const flowKey = `${startStage}->${flow.endStage}`;
                          const isFlowExpanded = expandedFlows.has(flowKey);
                          const percentage = ((flow.count / totalCount) * 100).toFixed(0);
                          
                          return (
                            <div key={index} className="bg-white rounded border">
                              <Button
                                variant="ghost"
                                className="w-full p-3 h-auto justify-between text-left hover:bg-gray-50"
                                onClick={() => toggleFlowExpansion(flowKey)}
                              >
                                <div className="flex items-center gap-3">
                                  <ArrowRight className="h-3 w-3 text-gray-400" />
                                  <div 
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: getStageColor(flow.endStage) }}
                                  />
                                  <div>
                                    <div className="font-medium text-sm">{flow.endStage}</div>
                                    <div className="text-xs text-gray-500">
                                      {flow.count} deals • {percentage}% • {formatCurrency(flow.value)}
                                    </div>
                                  </div>
                                </div>
                                {isFlowExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              </Button>
                              
                              {isFlowExpanded && (
                                <div className="border-t bg-gray-50 p-3">
                                  <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {flow.movements
                                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                      .map((movement, idx) => (
                                      <div key={idx} className="text-xs p-2 bg-white rounded border">
                                        <div className="flex items-center justify-between">
                                          <div className="font-medium text-gray-900 truncate max-w-[60%]">
                                            {movement.opportunityName}
                                          </div>
                                          <div className="text-gray-500 text-right">
                                            {formatDate(movement.date)}
                                          </div>
                                        </div>
                                        {movement.clientName && (
                                          <div className="text-gray-600 truncate mt-1">
                                            {movement.clientName}
                                          </div>
                                        )}
                                        <div className="flex items-center justify-between mt-1">
                                          <div className="text-gray-600">
                                            {formatCurrency(movement.value)}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            ID: {movement.opportunityId}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Middle Column: Sankey Diagram - 2/4 width */}
            <div className="lg:col-span-2">
              <h4 className="font-semibold text-gray-900 mb-3">Sankey Flow Diagram</h4>
              <div className="w-full overflow-x-auto">
                <svg width="1000" height="500" className="border rounded-lg bg-white">
                  <defs></defs>
                  
                  {(() => {
                    // Convert flow data to arrays for Sankey
                    const flows = Array.from(flowMap.values());
                    
                    // Calculate node positions
                    const leftStages = Array.from(new Set(flows.map(f => f.startStage)));
                    const rightStages = Array.from(new Set(flows.map(f => f.endStage)));
                    
                    // Stage order for consistent positioning (including closed stages as outcomes)
                    const stageOrder = [
                      'Validation/Introduction',
                      'Discover',
                      'Developing Champions',
                      'ROI Analysis/Pricing',
                      'Negotiation/Review',
                      'Closed Won',
                      'Closed Lost'
                    ];
                    
                    // Sort left stages in the same order
                    const sortedLeftStages = leftStages.sort((a, b) => {
                      const indexA = stageOrder.indexOf(a);
                      const indexB = stageOrder.indexOf(b);
                      
                      if (indexA !== -1 && indexB !== -1) {
                        return indexA - indexB;
                      }
                      if (indexA !== -1) return -1;
                      if (indexB !== -1) return 1;
                      return a.localeCompare(b);
                    });
                    
                    const nodeWidth = 120;
                    const nodeHeight = 30;
                    const leftX = 80;
                    const rightX = 800;
                    const maxCount = Math.max(...flows.map(f => f.count));
                    
                    // Position left nodes
                    const leftNodes = sortedLeftStages.map((stage, i) => ({
                      id: stage,
                      x: leftX,
                      y: 50 + i * 60,
                      width: nodeWidth,
                      height: nodeHeight,
                      color: getStageColor(stage),
                      count: flows.filter(f => f.startStage === stage).reduce((sum, f) => sum + f.count, 0)
                    }));
                    
                    // Sort right stages in the same order
                    const sortedRightStages = rightStages.sort((a, b) => {
                      const indexA = stageOrder.indexOf(a);
                      const indexB = stageOrder.indexOf(b);
                      
                      // If both stages are in the order list, sort by their index
                      if (indexA !== -1 && indexB !== -1) {
                        return indexA - indexB;
                      }
                      // If only one is in the list, prioritize it
                      if (indexA !== -1) return -1;
                      if (indexB !== -1) return 1;
                      // If neither is in the list, sort alphabetically
                      return a.localeCompare(b);
                    });
                    
                    // Position right nodes
                    const rightNodes = sortedRightStages.map((stage, i) => ({
                      id: stage,
                      x: rightX,
                      y: 50 + i * 60,
                      width: nodeWidth,
                      height: nodeHeight,
                      color: getStageColor(stage),
                      count: flows.filter(f => f.endStage === stage).reduce((sum, f) => sum + f.count, 0)
                    }));
                    
                    const allNodes = [...leftNodes, ...rightNodes];
                    
                    return (
                      <>
                        {/* Draw flows */}
                        {flows.map((flow, index) => {
                          const sourceNode = leftNodes.find(n => n.id === flow.startStage);
                          const targetNode = rightNodes.find(n => n.id === flow.endStage);
                          
                          if (!sourceNode || !targetNode) return null;
                          
                          const strokeWidth = Math.max(3, (flow.count / maxCount) * 30);
                          const x1 = sourceNode.x + sourceNode.width;
                          const y1 = sourceNode.y + sourceNode.height / 2;
                          const x2 = targetNode.x;
                          const y2 = targetNode.y + targetNode.height / 2;
                          
                          const midX = (x1 + x2) / 2;
                          
                          // Curved path for better visual flow
                          const path = `M ${x1} ${y1} Q ${midX} ${y1} ${midX} ${(y1 + y2) / 2} Q ${midX} ${y2} ${x2} ${y2}`;
                          
                          return (
                            <g key={index}>
                              <path
                                d={path}
                                stroke={sourceNode.color}
                                strokeWidth={strokeWidth}
                                fill="none"
                                opacity="0.6"
                                style={{ cursor: 'pointer' }}
                              >
                                <title>
                                  {flow.startStage} → {flow.endStage}: {flow.count} deals ({formatCurrency(flow.value)})
                                </title>
                              </path>
                            </g>
                          );
                        })}
                        
                        {/* Draw nodes */}
                        {allNodes.map((node, index) => (
                          <g key={index}>
                            <rect
                              x={node.x}
                              y={node.y}
                              width={node.width}
                              height={node.height}
                              rx="8"
                              fill={node.color}
                              opacity="0.9"
                              style={{ cursor: 'pointer' }}
                            >
                              <title>
                                {node.id}: {node.count} deals
                              </title>
                            </rect>
                            <text
                              x={node.x + node.width / 2}
                              y={node.y + node.height / 2 - 3}
                              textAnchor="middle"
                              fontSize="11"
                              fontWeight="600"
                              fill="white"
                              pointerEvents="none"
                            >
                              {node.id.length > 16 ? node.id.substring(0, 14) + '...' : node.id}
                            </text>
                            <text
                              x={node.x + node.width / 2}
                              y={node.y + node.height / 2 + 10}
                              textAnchor="middle"
                              fontSize="9"
                              fill="white"
                              opacity="0.9"
                              pointerEvents="none"
                            >
                              {node.count} deals
                            </text>
                          </g>
                        ))}
                        
                        {/* Labels */}
                        <text x={leftX + nodeWidth/2} y={30} textAnchor="middle" fontSize="12" fontWeight="600" fill="#374151">
                          Starting Stages
                        </text>
                        <text x={rightX + nodeWidth/2} y={30} textAnchor="middle" fontSize="12" fontWeight="600" fill="#374151">
                          Ending Stages
                        </text>
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>

            {/* Right Column: Flow Breakdown by Ending Stage - 1/4 width */}
            <div className="lg:col-span-1">
              <h4 className="font-semibold text-gray-900 mb-3">Flow Breakdown by Ending Stage</h4>
              <div className="space-y-3">
                {(() => {
                  // Group flows by ending stage
                  const endingStageGroups = new Map<string, FlowData[]>();
                  
                  recentMovements.forEach(movement => {
                    const endStage = movement.to;
                    
                    if (!endingStageGroups.has(endStage)) {
                      endingStageGroups.set(endStage, []);
                    }
                    
                    const existingFlow = endingStageGroups.get(endStage)!.find(f => f.startStage === movement.from && f.endStage === movement.to);
                    
                    if (existingFlow) {
                      existingFlow.count += 1;
                      existingFlow.value += movement.value;
                      existingFlow.movements.push(movement);
                    } else {
                      endingStageGroups.get(endStage)!.push({
                        startStage: movement.from,
                        endStage: movement.to,
                        count: 1,
                        value: movement.value,
                        movements: [movement]
                      });
                    }
                  });

                  // Define stage order
                  const stageOrder = [
                    'Validation/Introduction',
                    'Discover',
                    'Developing Champions',
                    'ROI Analysis/Pricing',
                    'Negotiation/Review',
                    'Closed Won',
                    'Closed Lost'
                  ];

                  return Array.from(endingStageGroups.entries())
                    .sort(([stageA], [stageB]) => {
                      const indexA = stageOrder.indexOf(stageA);
                      const indexB = stageOrder.indexOf(stageB);
                      
                      // If both stages are in the order list, sort by index
                      if (indexA !== -1 && indexB !== -1) {
                        return indexA - indexB;
                      }
                      
                      // If only one stage is in the order list, prioritize it
                      if (indexA !== -1) return -1;
                      if (indexB !== -1) return 1;
                      
                      // If neither stage is in the order list, sort alphabetically
                      return stageA.localeCompare(stageB);
                    })
                    .map(([endStage, flows]) => {
                      const totalCount = flows.reduce((sum, f) => sum + f.count, 0);
                      const totalValue = flows.reduce((sum, f) => sum + f.value, 0);
                      const isExpanded = expandedStages.has(endStage);
                      
                      return (
                        <div key={endStage} className="border rounded-lg">
                          <Button
                            variant="ghost"
                            className="w-full p-3 h-auto justify-between hover:bg-gray-50"
                            onClick={() => toggleStageExpansion(endStage)}
                          >
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: getStageColor(endStage) }}
                              />
                              <div className="text-left">
                                <div className="font-medium text-gray-900 text-sm">{endStage}</div>
                                <div className="text-xs text-gray-500">
                                  {totalCount} movements • {formatCurrency(totalValue)}
                                </div>
                              </div>
                            </div>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                          
                          {isExpanded && (
                            <div className="px-3 pb-3">
                              <div className="space-y-2">
                                {flows
                                  .sort((a, b) => b.count - a.count)
                                  .map((flow, index) => {
                                    const flowKey = `${endStage}-${flow.startStage}-${flow.endStage}`;
                                    const isFlowExpanded = expandedFlows.has(flowKey);
                                    
                                    return (
                                      <div key={index} className="space-y-1">
                                        <Button
                                          variant="ghost"
                                          className="w-full p-2 h-auto justify-between hover:bg-gray-100 bg-gray-50 rounded text-xs"
                                          onClick={() => toggleFlowExpansion(flowKey)}
                                        >
                                          <div className="flex items-center gap-2">
                                            <div 
                                              className="w-2 h-2 rounded-full"
                                              style={{ backgroundColor: getStageColor(flow.startStage) }}
                                            />
                                            <span className="text-gray-700">{flow.startStage}</span>
                                            <ArrowRight className="h-3 w-3 text-gray-400" />
                                            <span className="font-medium text-gray-900">{flow.endStage}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <div className="text-right">
                                              <div className="font-medium text-gray-900">{flow.count}</div>
                                              <div className="text-gray-500">{formatCurrency(flow.value)}</div>
                                            </div>
                                            {isFlowExpanded ? (
                                              <ChevronDown className="h-3 w-3 text-gray-400" />
                                            ) : (
                                              <ChevronRight className="h-3 w-3 text-gray-400" />
                                            )}
                                          </div>
                                        </Button>
                                        
                                        {isFlowExpanded && (
                                          <div className="ml-4 space-y-1">
                                            {flow.movements
                                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                              .map((movement, movIndex) => (
                                                <div key={movIndex} className="flex items-center justify-between py-1 px-2 bg-gray-100 rounded text-xs">
                                                  <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-gray-900 truncate">{movement.opportunityName}</div>
                                                    <div className="text-gray-500">{formatDate(new Date(movement.date))}</div>
                                                  </div>
                                                  <div className="text-right ml-2">
                                                    <div className="font-medium text-gray-900">{formatCurrency(movement.value)}</div>
                                                  </div>
                                                </div>
                                              ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    });
                })()}
              </div>
            </div>


          </div>
        )}
      </CardContent>
    </Card>
  );
}