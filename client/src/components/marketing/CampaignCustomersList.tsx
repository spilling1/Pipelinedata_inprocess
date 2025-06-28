import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Trash2, DollarSign, Calendar, Search, Filter, Edit } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import EditCampaignCustomerForm from "./EditCampaignCustomerForm";

interface CampaignCustomer {
  id: number;
  campaignId: number;
  opportunityId: number;
  stage: string;
  year1Arr: number;
  tcv: number;
  snapshotDate: string;
  closeDate: string | null;
  attendees: number | null;
  createdAt: string;
  opportunity: {
    id: number;
    name: string;
    clientName: string;
    owner: string;
  };
}

interface CurrentSnapshot {
  opportunityId: number;
  stage: string;
  year1Arr: number | null;
  tcv: number | null;
  snapshotDate: string;
  closeDate: string | null;
  enteredPipeline: string | null;
  targetAccount: number | null;
  isOutdated?: boolean;
  outdatedNote?: string;
}

interface CampaignCustomersListProps {
  campaignId: number;
}

export default function CampaignCustomersList({ campaignId }: CampaignCustomersListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<CampaignCustomer | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<CampaignCustomer | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pipelineFilter, setPipelineFilter] = useState("all");
  const [analyticsFilter, setAnalyticsFilter] = useState("all");
  
  const { data: customers = [], isLoading, error } = useQuery<CampaignCustomer[]>({
    queryKey: [`/api/marketing/campaigns/${campaignId}/customers`],
    enabled: !!campaignId,
  });

  // Fetch campaign details to get start date
  const { data: campaign } = useQuery<{ id: number; name: string; startDate: string; }>({
    queryKey: [`/api/marketing/campaigns/${campaignId}`],
    enabled: !!campaignId,
  });

  // Fetch current snapshots for all customers
  const { data: currentSnapshots = [] } = useQuery<Array<{
    opportunityId: number;
    stage: string;
    year1Arr: number | null;
    tcv: number | null;
    snapshotDate: string;
    closeDate: string | null;
    enteredPipeline: string | null;
    targetAccount: number | null;
    isOutdated?: boolean;
    outdatedNote?: string;
  }>>({
    queryKey: [`/api/marketing/campaigns/${campaignId}/current-snapshots`],
    enabled: !!campaignId,
  });

  // Helper function to get current snapshot data for a customer
  const getCurrentSnapshot = (customer: CampaignCustomer) => {
    const currentSnapshot = currentSnapshots.find(s => s.opportunityId === customer.opportunityId);
    if (currentSnapshot) {
      return {
        stage: currentSnapshot.stage,
        year1Arr: currentSnapshot.year1Arr,
        tcv: currentSnapshot.tcv,
        snapshotDate: currentSnapshot.snapshotDate,
        closeDate: currentSnapshot.closeDate,
        enteredPipeline: currentSnapshot.enteredPipeline,
        isOutdated: currentSnapshot.isOutdated,
        outdatedNote: currentSnapshot.outdatedNote
      };
    }
    // Fallback to starting values if no current snapshot found
    return {
      stage: customer.stage,
      year1Arr: customer.year1Arr,
      tcv: customer.tcv,
      snapshotDate: customer.snapshotDate,
      closeDate: customer.closeDate,
      enteredPipeline: null,
      isOutdated: false,
      outdatedNote: undefined
    };
  };

  // Helper function to check if customer should be excluded from analytics
  const isCustomerExcludedFromAnalytics = (customer: CampaignCustomer) => {
    // Exclude if originally "Closed Won" when added to campaign
    if (customer.stage === 'Closed Won') {
      return { excluded: true, reason: 'pre-existing' };
    }
    
    const currentSnapshot = getCurrentSnapshot(customer);
    
    // Exclude if never entered pipeline (no enteredPipeline date)
    if (!currentSnapshot.enteredPipeline) {
      return { excluded: true, reason: 'never-entered-pipeline' };
    }
    
    // Exclude if current close date is before campaign start date
    if (campaign?.startDate) {
      if (currentSnapshot.closeDate) {
        const closeDate = new Date(currentSnapshot.closeDate);
        const campaignStartDate = new Date(campaign.startDate);
        if (closeDate < campaignStartDate) {
          return { excluded: true, reason: 'closed-before-campaign' };
        }
      }
    }
    
    return { excluded: false, reason: null };
  };

  // Delete customer mutation
  const deleteMutation = useMutation({
    mutationFn: async (opportunityId: number) => {
      const response = await fetch(`/api/marketing/campaigns/${campaignId}/customers/${opportunityId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        let errorMessage = 'Failed to delete customer';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Response might not have JSON body
        }
        throw new Error(errorMessage);
      }
      // Handle 204 No Content response (successful deletion with no body)
      return response.status === 204 ? { success: true } : response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch customer data
      queryClient.invalidateQueries({ queryKey: [`/api/marketing/campaigns/${campaignId}/customers`] });
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/analytics/campaign'] });
      
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
      
      toast({
        title: "Customer removed",
        description: "Customer has been successfully removed from the campaign.",
      });
    },
    onError: (error) => {
      console.error('Error deleting customer:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove customer from campaign.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteCustomer = (customer: CampaignCustomer) => {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  };

  const handleEditCustomer = (customer: CampaignCustomer) => {
    setCustomerToEdit(customer);
    setEditDialogOpen(true);
  };

  const confirmDelete = () => {
    if (customerToDelete) {
      deleteMutation.mutate(customerToDelete.opportunityId);
    }
  };

  console.log('🔍 CampaignCustomersList - Campaign ID:', campaignId);
  console.log('📊 Customers data:', customers);
  console.log('📊 Current snapshots data:', currentSnapshots);
  console.log('⏳ Loading state:', isLoading);
  console.log('❌ Error state:', error);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading customers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-red-500">Error loading customers: {String(error)}</div>
      </div>
    );
  }

  if (!customers || customers.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">No customers associated with this campaign yet.</p>
      </div>
    );
  }

  // Get unique stages for filter dropdown
  const uniqueStages = Array.from(new Set(
    currentSnapshots.map(snapshot => snapshot.stage).filter(Boolean)
  )).sort();

  // Filter and sort customers
  const filteredAndSortedCustomers = [...customers]
    .filter((customer) => {
      // Filter by name
      const customerName = (customer.opportunity.clientName || customer.opportunity.name).toLowerCase();
      const matchesName = customerName.includes(nameFilter.toLowerCase());
      
      // Filter by current status
      const currentSnapshot = getCurrentSnapshot(customer);
      const currentStage = currentSnapshot?.stage || '';
      const matchesStatus = 
        statusFilter === 'all' || 
        currentStage === statusFilter ||
        (statusFilter === 'all-open' && currentStage !== 'Closed Won' && currentStage !== 'Closed Lost');
      
      // Filter by pipeline entry
      const hasEnteredPipeline = currentSnapshot?.enteredPipeline !== null;
      const matchesPipeline = 
        pipelineFilter === 'all' ||
        (pipelineFilter === 'has-pipeline' && hasEnteredPipeline) ||
        (pipelineFilter === 'no-pipeline' && !hasEnteredPipeline);
      
      // Filter by analytics status
      const analyticsStatus = isCustomerExcludedFromAnalytics(customer);
      const matchesAnalytics = 
        analyticsFilter === 'all' ||
        (analyticsFilter === 'active' && !analyticsStatus.excluded) ||
        (analyticsFilter === 'never-entered-pipeline' && analyticsStatus.reason === 'never-entered-pipeline') ||
        (analyticsFilter === 'no-open-opp' && analyticsStatus.reason === 'closed-before-campaign') ||
        (analyticsFilter === 'closed-won-prior' && analyticsStatus.reason === 'pre-existing');
      
      return matchesName && matchesStatus && matchesPipeline && matchesAnalytics;
    })
    .sort((a, b) => {
      // Define priority order (lower number = higher priority)
      const getPriority = (customer: CampaignCustomer) => {
        const status = isCustomerExcludedFromAnalytics(customer);
        
        if (!status.excluded) {
          // Has "Entered Pipeline" date - highest priority
          return 0;
        }
        
        switch (status.reason) {
          case 'never-entered-pipeline':
            return 1; // "Never entered pipeline" - second priority
          case 'closed-before-campaign':
            return 2; // "No open opportunity after Campaign start" - third priority
          case 'pre-existing':
            return 3; // "Closed Won prior to Campaign start" - lowest priority
          default:
            return 4;
        }
      };
      
      // First sort by status priority
      const priorityA = getPriority(a);
      const priorityB = getPriority(b);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // If same priority, sort by customer name
      const nameA = (a.opportunity.clientName || a.opportunity.name).toLowerCase();
      const nameB = (b.opportunity.clientName || b.opportunity.name).toLowerCase();
      
      return nameA.localeCompare(nameB);
    });

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by customer name..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="all-open">All Open</SelectItem>
              {uniqueStages.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {stage}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-48">
          <Select value={pipelineFilter} onValueChange={setPipelineFilter}>
            <SelectTrigger>
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by pipeline" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pipeline Status</SelectItem>
              <SelectItem value="has-pipeline">Has Pipeline Entry</SelectItem>
              <SelectItem value="no-pipeline">No Pipeline Entry</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-48">
          <Select value={analyticsFilter} onValueChange={setAnalyticsFilter}>
            <SelectTrigger>
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by analytics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Analytics Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="never-entered-pipeline">Never Entered Pipeline</SelectItem>
              <SelectItem value="no-open-opp">No Open Opp</SelectItem>
              <SelectItem value="closed-won-prior">Closed Won Prior</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-gray-600 mb-4">
        Showing {filteredAndSortedCustomers.length} of {customers.length} customer{customers.length !== 1 ? 's' : ''}
        {nameFilter && ` matching "${nameFilter}"`}
        {statusFilter === 'all-open' && ` with open statuses`}
        {statusFilter !== 'all' && statusFilter !== 'all-open' && ` with status "${statusFilter}"`}
        {pipelineFilter === 'has-pipeline' && ` with pipeline entry`}
        {pipelineFilter === 'no-pipeline' && ` without pipeline entry`}
        {analyticsFilter === 'active' && ` - active in analytics`}
        {analyticsFilter === 'never-entered-pipeline' && ` - never entered pipeline`}
        {analyticsFilter === 'no-open-opp' && ` - no open opportunity after campaign start`}
        {analyticsFilter === 'closed-won-prior' && ` - closed won prior to campaign`}
        <div className="text-xs text-amber-600 mt-1">
          Note: Only customers with "entered pipeline" field populated count toward pipeline analytics
        </div>
      </div>
      
      {filteredAndSortedCustomers.length === 0 ? (
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">
            {nameFilter || statusFilter !== 'all' 
              ? 'No customers match your current filters.' 
              : 'No customers found.'
            }
          </p>
          {(nameFilter || statusFilter !== 'all' || pipelineFilter !== 'all' || analyticsFilter !== 'all') && (
            <Button 
              variant="outline" 
              onClick={() => {
                setNameFilter('');
                setStatusFilter('all');
                setPipelineFilter('all');
                setAnalyticsFilter('all');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        filteredAndSortedCustomers.map((customer) => {
          const currentSnapshot = getCurrentSnapshot(customer);
          
          // Determine analytics status and color
          const getAnalyticsStatus = (customer: any, currentSnapshot: any) => {
            const campaignStartDate = campaign?.startDate ? new Date(campaign.startDate) : new Date('2025-02-01');
            
            // Check if pre-existing closed won
            if (customer.stage === 'Closed Won') {
              return { status: 'closed-won-prior', color: '#4141f6' };
            }
            
            // Check if never entered pipeline
            if (!currentSnapshot?.enteredPipeline) {
              return { status: 'never-entered-pipeline', color: '#f6da41' };
            }
            
            // Check if current close date is before campaign start
            if (currentSnapshot?.closeDate && new Date(currentSnapshot.closeDate) < campaignStartDate) {
              return { status: 'no-open-opp', color: '#f64141' };
            }
            
            // Default to active
            return { status: 'active', color: '#41f641' };
          };
          
          const analyticsStatus = getAnalyticsStatus(customer, currentSnapshot);
          
          return (
            <Card key={customer.id} className="p-0 overflow-hidden">
              <div className="flex">
                {/* Colored indicator bar */}
                <div 
                  className="w-4 flex-shrink-0" 
                  style={{ backgroundColor: analyticsStatus.color }}
                />
                <div className="flex-1 p-3">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-medium">
                          {customer.opportunity.clientName || customer.opportunity.name}
                        </h4>
                        <span className="text-gray-600 text-sm">
                          Owner: {customer.opportunity.owner}
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-6">
                          <span className="text-green-600 font-medium">
                            Starting Value: Year 1 ARR: ${customer.year1Arr ? customer.year1Arr.toLocaleString() : '0'}
                          </span>
                          <Badge variant="outline" className="text-xs">{customer.stage}</Badge>
                          <span className="text-gray-500">
                            {format(new Date(customer.snapshotDate), 'MMM d, yyyy')}
                          </span>
                          {customer.closeDate && (
                            <span className="text-purple-600 font-medium text-xs bg-purple-50 px-2 py-1 rounded">
                              📅 Close: {format(new Date(customer.closeDate), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-6 text-gray-600">
                          <span>
                            Current Values: Year 1 ARR: ${currentSnapshot?.year1Arr ? currentSnapshot.year1Arr.toLocaleString() : '0'}
                          </span>
                          <Badge 
                            variant={currentSnapshot?.stage === 'Closed Won' ? 'default' : (currentSnapshot?.isOutdated ? 'destructive' : 'outline')} 
                            className="text-xs"
                          >
                            {currentSnapshot?.stage || 'Unknown'}
                          </Badge>
                          <span className="text-gray-500">
                            {currentSnapshot?.snapshotDate ? format(new Date(currentSnapshot.snapshotDate), 'MMM d, yyyy') : 'No date'}
                          </span>
                          {currentSnapshot?.closeDate && (
                            <span className="text-purple-600 font-medium text-xs bg-purple-50 px-2 py-1 rounded">
                              📅 Close: {format(new Date(currentSnapshot.closeDate), 'MMM d, yyyy')}
                            </span>
                          )}
                          {currentSnapshot?.enteredPipeline && (
                            <span className="text-blue-600 font-medium text-xs bg-blue-50 px-2 py-1 rounded">
                              📊 Pipeline Entry: {format(new Date(currentSnapshot.enteredPipeline), 'MMM d, yyyy')}
                            </span>
                          )}
                          {customer.attendees && (
                            <span className="text-indigo-600 font-medium text-xs bg-indigo-50 px-2 py-1 rounded">
                              👥 Attendees: {customer.attendees}
                            </span>
                          )}
                        </div>
                        {isCustomerExcludedFromAnalytics(customer).excluded && (
                          <div className="mt-2">
                            <span className="text-orange-600 font-medium italic">
                              {isCustomerExcludedFromAnalytics(customer).reason === 'closed-before-campaign' 
                                ? 'Customer not used in the analytics - No open opportunity after Campaign start'
                                : isCustomerExcludedFromAnalytics(customer).reason === 'never-entered-pipeline'
                                ? 'Customer not used in the analytics - Never entered pipeline'
                                : 'Customer not used in the analytics - Closed Won prior to Campaign start'
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-blue-500 hover:text-blue-700"
                        onClick={() => handleEditCustomer(customer)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteCustomer(customer)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })
      )}
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {customerToDelete?.opportunity.clientName || customerToDelete?.opportunity.name} from this campaign? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? 'Removing...' : 'Remove Customer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Customer Dialog */}
      {customerToEdit && (
        <EditCampaignCustomerForm
          customer={customerToEdit}
          isOpen={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setCustomerToEdit(null);
          }}
          onSuccess={() => {
            setEditDialogOpen(false);
            setCustomerToEdit(null);
          }}
        />
      )}
    </div>
  );
}