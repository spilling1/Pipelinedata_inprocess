import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

interface PipelineByOwnerData {
  owner: string;
  createdCount: number;
  createdValue: number;
  currentCount: number;
  currentValue: number;
  newDealsCount: number;
  newDealsValue: number;
  closedWonCount: number;
  closedWonValue: number;
  winRate: number;
}

interface PipelineByOwnerCardProps {
  campaignId: number;
}

export default function PipelineByOwnerCard({ campaignId }: PipelineByOwnerCardProps) {
  const { data: pipelineByOwner = [], isLoading } = useQuery<PipelineByOwnerData[]>({
    queryKey: [`/api/marketing/campaigns/${campaignId}/pipeline-by-owner`],
    enabled: !!campaignId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Pipeline by Owner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Loading pipeline data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pipelineByOwner.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Pipeline by Owner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No pipeline data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by total pipeline value descending
  const sortedData = [...pipelineByOwner].sort((a, b) => b.createdValue - a.createdValue);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Pipeline by Owner
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-medium">Owner</th>
                <th className="text-right py-3 px-2 font-medium">Total Pipeline</th>
                <th className="text-right py-3 px-2 font-medium">New Pipeline</th>
                <th className="text-right py-3 px-2 font-medium">Current Pipeline</th>
                <th className="text-right py-3 px-2 font-medium">Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((owner) => (
                <tr key={owner.owner} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="py-3 px-2">
                    <div className="font-medium">
                      {owner.owner || 'Unassigned'}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <div className="font-medium">
                      {owner.createdCount} / ${(owner.createdValue / 1000).toFixed(0)}K
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <div className="font-medium text-blue-600 dark:text-blue-400">
                      {owner.newDealsCount || 0} / ${((owner.newDealsValue || 0) / 1000).toFixed(0)}K
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <div className="font-medium text-amber-600 dark:text-amber-400">
                      {owner.currentCount} / ${(owner.currentValue / 1000).toFixed(0)}K
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <div className="font-medium text-purple-600 dark:text-purple-400">
                      {((owner.winRate || 0) * 100).toFixed(0)}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}