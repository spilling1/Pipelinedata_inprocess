import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Users, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import CampaignForm from "./CampaignForm";
import CampaignDetails from "./CampaignDetails";
import { apiRequest } from "@/lib/queryClient";

interface Campaign {
  id: number;
  name: string;
  type: string;
  startDate: string;
  influence?: string;
  cost?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function CampaignList() {
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ['/api/marketing/campaigns'],
  });

  const deleteMutation = useMutation({
    mutationFn: (campaignId: number) => 
      fetch(`/api/marketing/campaigns/${campaignId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/campaigns'] });
      toast({
        title: "Campaign deleted",
        description: "The campaign has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete campaign. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (campaign: Campaign) => {
    if (confirm(`Are you sure you want to delete "${campaign.name}"? This will also remove all associated customer data.`)) {
      deleteMutation.mutate(campaign.id);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No campaigns yet</h3>
          <p className="text-gray-500 text-center max-w-sm">
            Get started by creating your first marketing campaign to track performance and ROI.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map((campaign: Campaign) => (
          <Card key={campaign.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle 
                    className="text-lg hover:text-blue-600 transition-colors"
                    onClick={() => setSelectedCampaign(campaign)}
                  >
                    {campaign.name}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">{campaign.type}</Badge>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      {format(new Date(campaign.startDate), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingCampaign(campaign)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDelete(campaign)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {campaign.influence && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {campaign.influence}
                </p>
              )}
              
              <div className="flex items-center justify-between text-sm">
                {campaign.cost && (
                  <div className="flex items-center text-green-600">
                    <DollarSign className="h-3 w-3 mr-1" />
                    {campaign.cost.toLocaleString()}
                  </div>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedCampaign(campaign)}
                >
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editingCampaign && (
        <CampaignForm
          campaign={editingCampaign}
          onClose={() => setEditingCampaign(null)}
          onSuccess={() => setEditingCampaign(null)}
        />
      )}

      {selectedCampaign && (
        <CampaignDetails
          campaign={selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
        />
      )}
    </>
  );
}