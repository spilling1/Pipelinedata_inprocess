import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Calendar, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Target, 
  Plus,
  Trash2,
  Upload
} from "lucide-react";
import CampaignMetrics from './CampaignMetrics';
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import CustomerToCampaignForm from "./CustomerToCampaignForm";
import { apiRequest } from "@/lib/queryClient";
import { BulkImportDialog } from "./BulkImportDialog";

interface Campaign {
  id: number;
  name: string;
  type: string;
  startDate: string;
  influence?: string;
  cost?: number;
  notes?: string;
}

interface CampaignMetrics {
  currentClosedWon: {
    value: number;
    count: number;
  };
  currentOpenOpportunities: {
    count: number;
    value: number;
  };
  currentWinRate: number;
  startingOpportunities: number;
  startingPipelineValue: number;
  closeRate: number;
  cac: number | null;
}

interface CampaignDetailsProps {
  campaign: Campaign;
  onClose: () => void;
}

export default function CampaignDetails({ campaign, onClose }: CampaignDetailsProps) {
  if (!campaign) {
    return null;
  }
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useQuery<CampaignMetrics>({
    queryKey: ['marketing-analytics', campaign.id],
    queryFn: async (): Promise<CampaignMetrics> => {
      const response = await fetch(`/api/marketing/analytics/campaign/${campaign.id}`);
      if (!response.ok) {
        throw new Error(`Analytics request failed: ${response.status}`);
      }
      const data = await response.json();
      console.log('📊 Received analytics data:', data);
      return data as CampaignMetrics;
    },
  });

  // Debug logging
  console.log('🔍 Campaign ID:', campaign.id);
  console.log('📈 Metrics data:', metrics);
  console.log('❌ Metrics error:', metricsError);
  console.log('⏳ Loading state:', metricsLoading);

  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ['/api/marketing/campaigns', campaign.id, 'customers'],
  });

  const removeCustomerMutation = useMutation({
    mutationFn: (opportunityId: number) => 
      fetch(`/api/marketing/campaigns/${campaign.id}/customers/${opportunityId}`, { 
        method: 'DELETE' 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/marketing/campaigns', campaign.id, 'customers'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/marketing/analytics/campaign', campaign.id] 
      });
      toast({
        title: "Customer removed",
        description: "The customer has been removed from this campaign.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove customer from campaign.",
        variant: "destructive",
      });
    },
  });

  const handleRemoveCustomer = (opportunityId: number, customerName: string) => {
    if (confirm(`Remove ${customerName} from this campaign?`)) {
      removeCustomerMutation.mutate(opportunityId);
    }
  };

  const calculateCAC = () => {
    if (!campaign.cost || !(metrics as any)?.currentClosedWon?.count || (metrics as any).currentClosedWon.count === 0) {
      return null;
    }
    return campaign.cost / (metrics as any).currentClosedWon.count;
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {campaign.name}
            <Badge variant="secondary">{campaign.type}</Badge>
          </DialogTitle>
          <DialogDescription>
            Campaign details and performance metrics
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campaign Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Campaign Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center text-sm">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                Started: {format(new Date(campaign.startDate), 'MMMM d, yyyy')}
              </div>
              
              {campaign.cost && (
                <div className="flex items-center text-sm">
                  <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                  Budget: ${campaign.cost.toLocaleString()}
                </div>
              )}

              {campaign.influence && (
                <div>
                  <p className="text-sm font-medium mb-1">Influence Method:</p>
                  <p className="text-sm text-muted-foreground">{campaign.influence}</p>
                </div>
              )}

              {campaign.notes && (
                <div>
                  <p className="text-sm font-medium mb-1">Notes:</p>
                  <p className="text-sm text-muted-foreground">{campaign.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <CampaignMetrics campaignId={campaignId} campaignCost={campaign?.budget} />

          {/* Customer List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Associated Customers</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowBulkImport(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk Import
                  </Button>
                  <Button size="sm" onClick={() => setShowAddCustomer(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Customer
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {customersLoading ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : !customers || customers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No customers associated with this campaign yet.</p>
                  <Button 
                    variant="outline" 
                    className="mt-2"
                    onClick={() => setShowAddCustomer(true)}
                  >
                    Add First Customer
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer • Stage • Year 1 ARR</TableHead>
                      <TableHead>TCV</TableHead>
                      <TableHead>Snapshot Date</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers
                      .sort((a: any, b: any) => (b.opportunity.clientName || '').localeCompare(a.opportunity.clientName || ''))
                      .map((customer: any) => (
                      <TableRow key={customer.id} className="h-8">
                        <TableCell className="py-1">
                          <div className="text-sm">
                            <span className="font-medium">{customer.opportunity.clientName || 'Unknown'}</span>
                            <span className="text-muted-foreground"> • </span>
                            <span>{customer.stage || 'N/A'}</span>
                            <span className="text-muted-foreground"> • </span>
                            <span>{customer.year1Arr ? `$${customer.year1Arr.toLocaleString()}` : '$0'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-1">
                          {customer.tcv ? `$${customer.tcv.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className="py-1">
                          {customer.snapshotDate 
                            ? format(new Date(customer.snapshotDate), 'MMM d, yyyy')
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="py-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCustomer(
                              customer.opportunity.id, 
                              customer.opportunity.name
                            )}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Add Customer Modal */}
        {showAddCustomer && (
          <CustomerToCampaignForm
            campaignId={campaign.id}
            onClose={() => setShowAddCustomer(false)}
            onSuccess={() => setShowAddCustomer(false)}
          />
        )}

        {/* Bulk Import Modal */}
        {showBulkImport && (
          <BulkImportDialog
            isOpen={showBulkImport}
            onClose={() => setShowBulkImport(false)}
            campaignId={campaign.id}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}