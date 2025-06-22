import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GitBranch, BarChart3, List, ChevronDown, ChevronRight } from 'lucide-react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';

interface StageMovementOverviewCardProps {
  campaignId: number;
  campaignName: string;
  campaignStartDate: string;
}

interface StageFlowData {
  nodes: Array<{
    id: string;
    name: string;
    category: string;
  }>;
  links: Array<{
    source: string;
    target: string;
    value: number;
    customers: Array<{ name: string; dateMoved: Date }>;
    pipelineValue: number;
  }>;
}

export default function StageMovementOverviewCard({ 
  campaignId,
  campaignName,
  campaignStartDate 
}: StageMovementOverviewCardProps) {
  const [timeFilter, setTimeFilter] = useState('30');
  const [chartType, setChartType] = useState<'sankey' | 'list'>('sankey');
  const sankeyRef = useRef<SVGSVGElement>(null);

  // Fetch stage flow data
  const { data: stageFlowData, isLoading: isStageFlowLoading } = useQuery<StageFlowData>({
    queryKey: [`/api/marketing/campaigns/${campaignId}/stage-flow`, timeFilter],
    enabled: !!campaignId
  });

  // D3 Sankey Chart Effect
  useEffect(() => {
    if (!sankeyRef.current || chartType !== 'sankey') return;

    const svg = d3.select(sankeyRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 250;

    svg.attr("width", width).attr("height", height);

    try {
      // Check if data exists and has required structure
      if (!stageFlowData || 
          typeof stageFlowData !== 'object' ||
          !Array.isArray(stageFlowData.nodes) || 
          !Array.isArray(stageFlowData.links)) {
        console.log('Invalid stage flow data structure:', stageFlowData);
        svg.append("text")
          .attr("x", width / 2)
          .attr("y", height / 2)
          .attr("text-anchor", "middle")
          .text("No stage movement data available")
          .style("font", "14px sans-serif")
          .style("fill", "#6b7280");
        return;
      }

      // Validate nodes have required properties
      const validNodes = stageFlowData.nodes.filter(d => 
        d && 
        typeof d === 'object' && 
        typeof d.name === 'string' && 
        d.name.trim() !== ''
      );

      if (validNodes.length === 0) {
        console.log('No valid nodes found');
        svg.append("text")
          .attr("x", width / 2)
          .attr("y", height / 2)
          .attr("text-anchor", "middle")
          .text("No stages to display")
          .style("font", "14px sans-serif")
          .style("fill", "#6b7280");
        return;
      }

      const nodeNames = new Set(validNodes.map(d => d.name));
      
      // Validate links have required properties and reference valid nodes
      const validLinks = stageFlowData.links.filter(d => 
        d && 
        typeof d === 'object' &&
        typeof d.source === 'string' &&
        typeof d.target === 'string' &&
        d.source !== d.target && // Prevent self-loops
        nodeNames.has(d.source) && 
        nodeNames.has(d.target) && 
        typeof d.value === 'number' &&
        d.value > 0
      );

      if (validLinks.length === 0) {
        console.log('No valid links found');
        svg.append("text")
          .attr("x", width / 2)
          .attr("y", height / 2)
          .attr("text-anchor", "middle")
          .text("No stage transitions found")
          .style("font", "14px sans-serif")
          .style("fill", "#6b7280");
        return;
      }

      // Create node index mapping
      const nodeIndexMap = new Map(validNodes.map((node, index) => [node.name, index]));
      
      // Prepare data for D3 Sankey with proper typing
      const sankeyNodes = validNodes.map((d, i) => ({ 
        nodeId: i,
        name: d.name,
        category: d.category || 'default'
      }));
      
      const sankeyLinks = validLinks
        .map(d => {
          const sourceIndex = nodeIndexMap.get(d.source);
          const targetIndex = nodeIndexMap.get(d.target);
          
          if (sourceIndex === undefined || targetIndex === undefined) {
            return null;
          }
          
          return {
            source: sourceIndex,
            target: targetIndex,
            value: Math.max(1, d.value), // Ensure minimum value
            pipelineValue: d.pipelineValue || 0
          };
        })
        .filter(link => link !== null);

      if (sankeyLinks.length === 0) {
        console.log('No valid link mappings created');
        svg.append("text")
          .attr("x", width / 2)
          .attr("y", height / 2)
          .attr("text-anchor", "middle")
          .text("Unable to map stage transitions")
          .style("font", "14px sans-serif")
          .style("fill", "#6b7280");
        return;
      }

      // Create Sankey generator with error handling
      const sankeyGenerator = sankey()
        .nodeWidth(15)
        .nodePadding(10)
        .extent([[1, 1], [width - 1, height - 6]]);

      let graph;
      try {
        graph = sankeyGenerator({
          nodes: sankeyNodes.slice(), // Create copy to avoid mutation
          links: sankeyLinks.slice()  // Create copy to avoid mutation
        });
      } catch (sankeyError) {
        console.error('Sankey generation failed:', sankeyError);
        svg.append("text")
          .attr("x", width / 2)
          .attr("y", height / 2)
          .attr("text-anchor", "middle")
          .text("Stage flow visualization error")
          .style("font", "14px sans-serif")
          .style("fill", "#ef4444");
        return;
      }

      // Validate generated graph
      if (!graph || !graph.nodes || !graph.links || graph.nodes.length === 0) {
        console.log('Generated graph is invalid');
        svg.append("text")
          .attr("x", width / 2)
          .attr("y", height / 2)
          .attr("text-anchor", "middle")
          .text("Stage flow processing failed")
          .style("font", "14px sans-serif")
          .style("fill", "#ef4444");
        return;
      }

      // Draw links with validation
      const linkSelection = svg.append("g")
        .selectAll("path")
        .data(graph.links.filter((d: any) => d && d.width > 0))
        .join("path");

      linkSelection
        .attr("d", (d: any) => {
          try {
            return sankeyLinkHorizontal()(d);
          } catch (e) {
            console.warn('Link path generation failed for:', d);
            return null;
          }
        })
        .attr("stroke", "#e2e8f0")
        .attr("stroke-width", (d: any) => Math.max(1, d.width || 1))
        .style("fill", "none")
        .style("opacity", 0.6);

      // Draw nodes with validation
      const nodeSelection = svg.append("g")
        .selectAll("rect")
        .data(graph.nodes.filter((d: any) => d && typeof d.x0 === 'number' && typeof d.y0 === 'number'))
        .join("rect");

      nodeSelection
        .attr("x", (d: any) => d.x0 || 0)
        .attr("y", (d: any) => d.y0 || 0)
        .attr("height", (d: any) => Math.max(1, (d.y1 || 0) - (d.y0 || 0)))
        .attr("width", (d: any) => Math.max(1, (d.x1 || 0) - (d.x0 || 0)))
        .attr("fill", "#3b82f6")
        .attr("rx", 2);

      // Add labels with validation
      const labelSelection = svg.append("g")
        .selectAll("text")
        .data(graph.nodes.filter((d: any) => d && d.name && typeof d.x0 === 'number'))
        .join("text");

      labelSelection
        .attr("x", (d: any) => (d.x0 || 0) < width / 2 ? (d.x1 || 0) + 6 : (d.x0 || 0) - 6)
        .attr("y", (d: any) => ((d.y1 || 0) + (d.y0 || 0)) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", (d: any) => (d.x0 || 0) < width / 2 ? "start" : "end")
        .text((d: any) => (d.name || '').substring(0, 20)) // Truncate long names
        .style("font", "12px sans-serif")
        .style("fill", "#374151");

    } catch (error) {
      console.error('Sankey chart rendering error:', error);
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .text("Visualization unavailable")
        .style("font", "14px sans-serif")
        .style("fill", "#ef4444");
    }
  }, [stageFlowData, chartType]);

  if (isStageFlowLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <GitBranch className="h-5 w-5" />
            <span>Stage Movement Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-muted-foreground">Loading stage movements...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <GitBranch className="h-5 w-5" />
            <span>Stage Movement Overview</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="60">Last 60 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex rounded-md border">
              <Button
                variant={chartType === 'sankey' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('sankey')}
                className="rounded-r-none"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!stageFlowData || (stageFlowData.links?.length === 0 && stageFlowData.nodes?.length === 0) ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No stage movements found for the selected timeframe</p>
              <p className="text-xs mt-1">Try selecting a different time period</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Chart Visualization */}
            <div className="h-64">
              {chartType === "sankey" ? (
                <div className="w-full h-full flex items-center justify-center">
                  <svg ref={sankeyRef} className="border rounded-lg bg-white dark:bg-gray-800"></svg>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Stage breakdown view removed</p>
                  </div>
                </div>
              )}
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground"># of Stage Changes:</span>
                <span className="font-medium">{stageFlowData.links?.length || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pipeline Value moved up a stage:</span>
                <span className="font-medium">
                  ${(stageFlowData.links?.reduce((sum, link) => sum + link.pipelineValue, 0) || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}