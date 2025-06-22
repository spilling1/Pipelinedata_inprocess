import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal, SankeyNode, SankeyLink } from "d3-sankey";

interface StageFlowSankeyChartProps {
  campaignId: number;
  campaignName: string;
}

interface StageFlowData {
  nodes: Array<{ id: string; name: string; category: string }>;
  links: Array<{ source: string; target: string; value: number; customers: string[] }>;
}

interface SankeyNodeExtended extends SankeyNode<{}, {}> {
  id?: string;
  name?: string;
  category?: string;
}

interface SankeyLinkExtended extends SankeyLink<{}, {}> {
  source: SankeyNodeExtended;
  target: SankeyNodeExtended;
  value: number;
  customers?: string[];
}

export default function StageFlowSankeyChart({ campaignId, campaignName }: StageFlowSankeyChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  
  const { data: stageFlowData, isLoading, error } = useQuery<StageFlowData>({
    queryKey: [`/api/marketing/campaigns/${campaignId}/stage-flow`],
    enabled: !!campaignId,
  });

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value.toFixed(0)}`;
    }
  };

  const getStageColor = (category: string) => {
    switch (category) {
      case 'won': return '#22c55e'; // green
      case 'lost': return '#ef4444'; // red
      case 'early': return '#3b82f6'; // blue
      case 'middle': return '#f59e0b'; // amber
      case 'late': return '#8b5cf6'; // purple
      case 'other': return '#6b7280'; // gray
      default: return '#6b7280'; // gray
    }
  };

  useEffect(() => {
    if (!stageFlowData || !svgRef.current || stageFlowData.nodes.length === 0) {
      return;
    }

    try {
      console.log('🔍 Sankey rendering - Nodes:', stageFlowData.nodes);
      console.log('🔍 Sankey rendering - Links:', stageFlowData.links);

      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      const width = 800;
      const height = 400;
      const margin = { top: 20, right: 20, bottom: 20, left: 20 };

      svg.attr("width", width).attr("height", height);

      // Create sankey generator
      const sankeyGenerator = sankey<{}, {}>()
        .nodeWidth(15)
        .nodePadding(10)
        .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]]);

      // Prepare data for sankey - ensure all nodes have valid names
      const validNodes = stageFlowData.nodes.filter(d => d.id && d.name && d.id.trim() !== '');
      const nodeIds = new Set(validNodes.map(d => d.id));
      
      console.log('🔍 Valid nodes:', validNodes);
      console.log('🔍 Node IDs:', Array.from(nodeIds));
      
      // Only include links where both source and target exist in nodes
      const validLinks = stageFlowData.links.filter(d => 
        d.source && d.target && 
        nodeIds.has(d.source) && nodeIds.has(d.target) && 
        d.value > 0
      );

      console.log('🔍 Valid links:', validLinks);

      if (validNodes.length === 0 || validLinks.length === 0) {
        console.log('❌ No valid nodes or links for Sankey chart');
        return;
      }

      const sankeyData = sankeyGenerator({
        nodes: validNodes as any,
        links: validLinks.map(d => ({
          source: d.source,
          target: d.target,
          value: d.value,
          customers: d.customers
        })) as any
      });

      console.log('✅ Sankey data generated successfully');

      // Draw links
      svg.append("g")
        .selectAll("path")
        .data(sankeyData.links)
        .join("path")
        .attr("d", sankeyLinkHorizontal())
        .attr("stroke", "#ddd")
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", (d: any) => Math.max(1, d.width))
        .attr("fill", "none");

      // Draw nodes
      svg.append("g")
        .selectAll("rect")
        .data(sankeyData.nodes)
        .join("rect")
        .attr("x", (d: any) => d.x0)
        .attr("y", (d: any) => d.y0)
        .attr("height", (d: any) => d.y1 - d.y0)
        .attr("width", (d: any) => d.x1 - d.x0)
        .attr("fill", (d: any) => getStageColor(d.category || 'other'))
        .attr("stroke", "#333")
        .attr("stroke-width", 1);

      // Add node labels
      svg.append("g")
        .selectAll("text")
        .data(sankeyData.nodes)
        .join("text")
        .attr("x", (d: any) => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr("y", (d: any) => (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", (d: any) => d.x0 < width / 2 ? "start" : "end")
        .attr("font-size", "12px")
        .attr("font-weight", "500")
        .text((d: any) => d.name || '');

    } catch (error) {
      console.error('❌ Sankey chart error:', error);
    }
  }, [stageFlowData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stage Flow Analysis</CardTitle>
          <CardDescription>Customer movement between sales stages over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-gray-100 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  if (error || !stageFlowData || stageFlowData.nodes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stage Flow Analysis</CardTitle>
          <CardDescription>Customer movement between sales stages over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center text-gray-500">
            {error ? 'Error loading stage flow data' : 'No stage transitions available'}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalTransitions = stageFlowData.links.length;
  const totalValue = stageFlowData.links.reduce((sum, link) => sum + link.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stage Flow Analysis</CardTitle>
        <CardDescription>
          Customer movement between sales stages for {campaignName}
        </CardDescription>
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-gray-600">Transitions: </span>
            <span className="font-semibold">{totalTransitions}</span>
          </div>
          <div>
            <span className="text-gray-600">Total Value: </span>
            <span className="font-semibold">{formatCurrency(totalValue)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-96 overflow-x-auto">
          <svg ref={svgRef}></svg>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Early Stage</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-500 rounded"></div>
            <span>Middle Stage</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded"></div>
            <span>Late Stage</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Closed Won</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Closed Lost</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-500 rounded"></div>
            <span>Other</span>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Flow diagram shows customer progression through sales stages. Hover over flows and stages for details.
        </div>
      </CardContent>
    </Card>
  );
}