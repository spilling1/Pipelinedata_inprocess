import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, Minus, DollarSign, Target, Users } from "lucide-react";

export default function CampaignComparisons() {
  const [selectedType, setSelectedType] = useState<string>("all");

  const { data: comparisons, isLoading } = useQuery({
    queryKey: ['/api/marketing/analytics/campaign-comparisons', selectedType === "all" ? undefined : selectedType],
  });

  const { data: typeAggregates } = useQuery({
    queryKey: ['/api/marketing/analytics/campaign-type-aggregates'],
  });

  // Get unique campaign types for filter
  const campaignTypes = typeAggregates?.map((agg: any) => agg.type) || [];

  const getPerformanceIcon = (winRate: number) => {
    if (winRate >= 30) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (winRate >= 15) return <Minus className="h-4 w-4 text-yellow-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getPerformanceBadge = (winRate: number) => {
    if (winRate >= 30) return <Badge className="bg-green-100 text-green-800">High</Badge>;
    if (winRate >= 15) return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
    return <Badge className="bg-red-100 text-red-800">Low</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance Comparison</CardTitle>
          <CardDescription>
            Compare campaigns by win rate, CAC, and pipeline value
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Campaign Performance Comparison</CardTitle>
            <CardDescription>
              Compare campaigns by win rate, CAC, and pipeline value
            </CardDescription>
          </div>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaign Types</SelectItem>
              {campaignTypes.map((type: string) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {!comparisons || comparisons.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No campaigns found for comparison.</p>
            {selectedType !== "all" && (
              <p className="text-sm mt-2">Try selecting "All Campaign Types" to see more results.</p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Opportunities</TableHead>
                <TableHead>Year 1 ARR</TableHead>
                <TableHead>Win Rate</TableHead>
                <TableHead>CAC</TableHead>
                <TableHead>Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisons.map((campaign: any) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <div className="font-medium">{campaign.name}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{campaign.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                      {campaign.totalOpportunities}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1 text-muted-foreground" />
                      {campaign.totalYear1Arr.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {getPerformanceIcon(campaign.winRate)}
                      <span className="ml-2">{campaign.winRate}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {campaign.cac ? (
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1 text-muted-foreground" />
                        {campaign.cac.toLocaleString()}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {getPerformanceBadge(campaign.winRate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        
        {selectedType !== "all" && comparisons && comparisons.length > 0 && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Campaign Type: {selectedType}</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Campaigns</p>
                <p className="font-medium">{comparisons.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg Win Rate</p>
                <p className="font-medium">
                  {comparisons.length > 0 
                    ? Math.round(comparisons.reduce((sum: number, c: any) => sum + c.winRate, 0) / comparisons.length)
                    : 0
                  }%
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Pipeline</p>
                <p className="font-medium">
                  ${comparisons.reduce((sum: number, c: any) => sum + c.totalYear1Arr, 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg CAC</p>
                <p className="font-medium">
                  {(() => {
                    const campaignsWithCAC = comparisons.filter((c: any) => c.cac);
                    return campaignsWithCAC.length > 0
                      ? `$${Math.round(campaignsWithCAC.reduce((sum: number, c: any) => sum + c.cac, 0) / campaignsWithCAC.length).toLocaleString()}`
                      : 'N/A';
                  })()}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}