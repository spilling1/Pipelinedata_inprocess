import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ArrowLeft, Plus, Target, TrendingUp, Users, DollarSign, MoreVertical, Edit, Trash2, UserPlus, ArrowUpDown, Filter, Calendar, ExternalLink, BarChart3, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CampaignForm from "../components/marketing/CampaignForm";
import CustomerToCampaignForm from "../components/marketing/CustomerToCampaignForm";
import CampaignCustomersList from "../components/marketing/CampaignCustomersList";
import PipelineWalkChart from "../components/marketing/PipelineWalkChart";
import StageMovementsCard from "../components/marketing/StageMovementsCard";
import StageFlowCard from "../components/marketing/StageFlowCard";
import PipelineByOwnerCard from "../components/marketing/PipelineByOwnerCard";



export default function MarketingAnalyticsPage() {
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<any>(null);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [activeTab, setActiveTab] = useState("analytics");
  
  // Sorting and filtering state
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [nameFilter, setNameFilter] = useState<string>('');
  
  // Team member form state
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/marketing/campaigns'],
  });

  // Process campaigns with sorting and filtering
  const filteredAndSortedCampaigns = campaigns
    .filter(campaign => {
      // Filter by type
      if (typeFilter !== 'all' && campaign.type?.toLowerCase() !== typeFilter.toLowerCase()) {
        return false;
      }
      // Filter by name
      if (nameFilter && !campaign.name?.toLowerCase().includes(nameFilter.toLowerCase())) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '');
      } else if (sortBy === 'date') {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        comparison = dateA - dateB;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  // Get unique campaign types for filter dropdown
  const typesSet = new Set(campaigns.map(c => c.type).filter(Boolean));
  const uniqueTypes = Array.from(typesSet).sort();

  const { data: campaignAnalytics } = useQuery<any>({
    queryKey: [`/api/marketing/campaigns/${selectedCampaign?.id}/analytics`],
    enabled: !!selectedCampaign?.id,
  });

  const { data: campaignCustomers = [] } = useQuery<any[]>({
    queryKey: [`/api/marketing/campaigns/${selectedCampaign?.id}/customers`],
    enabled: !!selectedCampaign?.id,
  });

  const { data: availableCustomers = [] } = useQuery<any[]>({
    queryKey: ['/api/marketing/customers/recent'],
    enabled: !!selectedCampaign?.id,
  });

  const { data: closedWonCustomers = [] } = useQuery<any[]>({
    queryKey: [`/api/marketing/campaigns/${selectedCampaign?.id}/closed-won-customers`],
    enabled: !!selectedCampaign?.id,
  });

  const { data: pipelineCustomers = [] } = useQuery<any[]>({
    queryKey: [`/api/marketing/campaigns/${selectedCampaign?.id}/pipeline-customers`],
    enabled: !!selectedCampaign?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (campaignId: number) => 
      fetch(`/api/marketing/campaigns/${campaignId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/campaigns'] });
      setSelectedCampaign(null);
      setDeletingCampaign(null);
      toast({
        title: "Campaign deleted",
        description: "The campaign and all associated customers have been removed.",
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

  const addCustomerMutation = useMutation({
    mutationFn: (data: any) => 
      fetch(`/api/marketing/campaigns/${selectedCampaign?.id}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/marketing/campaigns/${selectedCampaign?.id}/customers`] });
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/analytics/campaign', selectedCampaign?.id] });
      setShowCustomerForm(false);
      toast({
        title: "Customer added",
        description: "Customer has been associated with the campaign.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add customer to campaign.",
        variant: "destructive",
      });
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: (data: { campaignId: number, teamAttendees: any[] }) => 
      fetch(`/api/marketing/campaigns/${data.campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamAttendees: data.teamAttendees }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/campaigns'] });
      setNewMemberName('');
      setNewMemberRole('');
      toast({
        title: "Team member added",
        description: "Team member has been added to the campaign.",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to add team member. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addTeamMember = () => {
    if (!newMemberName.trim() || !newMemberRole.trim() || !selectedCampaign) return;
    
    const currentTeam = selectedCampaign.teamAttendees || [];
    const newTeamMember = { name: newMemberName.trim(), role: newMemberRole };
    const updatedTeam = [...currentTeam, newTeamMember];
    
    updateTeamMutation.mutate({
      campaignId: selectedCampaign.id,
      teamAttendees: updatedTeam
    });
  };

  const removeTeamMember = (indexToRemove: number) => {
    if (!selectedCampaign) return;
    
    const currentTeam = selectedCampaign.teamAttendees || [];
    const updatedTeam = currentTeam.filter((_: any, index: number) => index !== indexToRemove);
    
    updateTeamMutation.mutate({
      campaignId: selectedCampaign.id,
      teamAttendees: updatedTeam
    });
  };

  const clearTeamForm = () => {
    setNewMemberName('');
    setNewMemberRole('');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center space-x-4 mb-6">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Marketing Analytics
          </h1>
        </div>
        <div className="text-center py-12">Loading campaigns...</div>
      </div>
    );
  }

  if (showCreateForm) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowCreateForm(false)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Analytics
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Create New Campaign
          </h1>
        </div>
        <CampaignForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => setShowCreateForm(false)}
        />
      </div>
    );
  }

  if (editingCampaign) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setEditingCampaign(null)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Analytics
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Edit Campaign
          </h1>
        </div>
        <CampaignForm
          campaign={editingCampaign}
          onClose={() => setEditingCampaign(null)}
          onSuccess={() => setEditingCampaign(null)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Marketing Analytics
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/marketing-comparative">
            <Button variant="outline" size="sm">
              <BarChart3 className="w-4 h-4 mr-2" />
              Comparative Analytics
            </Button>
          </Link>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Campaign
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Campaigns List - 1 column */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Campaigns</CardTitle>
            <CardDescription>
              Select a campaign to view analytics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Filters and Sorting Controls - Condensed */}
            <div className="space-y-2 border-b pb-3">
              {/* Search and Type Filter in one row */}
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Search by name..."
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  className="h-7 text-xs"
                />
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {uniqueTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Controls - Condensed */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-600">Sort:</span>
                  <Select value={sortBy} onValueChange={(value: 'name' | 'date') => setSortBy(value)}>
                    <SelectTrigger className="h-6 w-16 text-xs border-0 p-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                  >
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </div>
                <div className="text-xs text-gray-500">
                  {filteredAndSortedCampaigns.length} / {campaigns.length}
                </div>
              </div>
            </div>

            {campaigns.length === 0 ? (
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No campaigns yet</p>
                <Button onClick={() => setShowCreateForm(true)} size="sm">
                  Create First Campaign
                </Button>
              </div>
            ) : filteredAndSortedCampaigns.length === 0 ? (
              <div className="text-center py-8">
                <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No campaigns match your filters</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setNameFilter('');
                    setTypeFilter('all');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              filteredAndSortedCampaigns.map((campaign: any) => (
                <div
                  key={campaign.id}
                  className={`p-2 rounded border transition-colors cursor-pointer ${
                    selectedCampaign?.id === campaign.id
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div 
                      className="flex-1"
                      onClick={() => setSelectedCampaign(campaign)}
                    >
                      <div className="font-medium text-sm leading-tight">{campaign.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 capitalize">{campaign.type}</span>
                        {campaign.startDate && (
                          <>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-blue-600">
                              {new Date(campaign.startDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-5 w-5 p-0 opacity-60 hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" side="bottom">
                        <DropdownMenuItem onClick={() => setEditingCampaign(campaign)}>
                          <Edit className="h-3 w-3 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeletingCampaign(campaign)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-3 w-3 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Analytics Panel - 3 columns */}
        <Card className="col-span-3">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>
                  {selectedCampaign ? `${selectedCampaign.name}` : 'Campaign Management'}
                </CardTitle>
                <CardDescription>
                  {selectedCampaign 
                    ? 'Manage campaign performance and customer associations'
                    : 'Select a campaign from the left to view detailed analytics and manage customers'
                  }
                </CardDescription>
              </div>
              {selectedCampaign?.salesforceUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a 
                    href={selectedCampaign.salesforceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View in Salesforce
                  </a>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedCampaign ? (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  <TabsTrigger value="customers">Customers ({campaignCustomers.length})</TabsTrigger>
                  <TabsTrigger value="team">Team ({selectedCampaign.teamAttendees?.length || 0})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="analytics" className="space-y-6">
                  {/* Campaign Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Type</div>
                      <div className="text-lg font-semibold capitalize">{selectedCampaign.type}</div>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Start Date</div>
                      <div className="text-lg font-semibold">
                        {selectedCampaign.startDate 
                          ? new Date(selectedCampaign.startDate).toLocaleDateString('en-US', { timeZone: 'UTC' })
                          : 'Not set'
                        }
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Status</div>
                      <div className="text-lg font-semibold capitalize">{selectedCampaign.status || 'active'}</div>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Budget</div>
                      <div className="text-lg font-semibold">
                        {selectedCampaign.cost ? `$${selectedCampaign.cost.toLocaleString()}` : '$N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Performance Metrics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {/* Closed Won */}
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600 dark:text-gray-400">Closed Won</div>
                          <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-bold">
                          ${campaignAnalytics?.currentClosedWon?.value?.toLocaleString() || '0'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {campaignAnalytics?.currentClosedWon?.count || 0} customers
                        </div>
                      </div>
                      
                      {/* Open Pipeline */}
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600 dark:text-gray-400">Open Pipeline</div>
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-bold">
                          {campaignAnalytics?.currentOpenOpportunities?.count || 0}
                        </div>
                        <div className="text-xs text-gray-500">
                          Total: {campaignAnalytics?.startingOpportunities || 0}
                        </div>
                      </div>
                      
                      {/* Current Pipeline Value */}
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600 dark:text-gray-400">Current Pipeline Value</div>
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-bold">
                          ${campaignAnalytics?.currentOpenOpportunities?.value?.toLocaleString() || '0'}
                        </div>
                        <div className="text-xs text-gray-500">
                          Total: ${campaignAnalytics?.totalCampaignPipeline?.toLocaleString() || '0'}
                        </div>
                      </div>
                      
                      {/* Win Rate */}
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600 dark:text-gray-400">Win Rate</div>
                          <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-bold">
                          {campaignAnalytics?.currentWinRate ? `${(campaignAnalytics.currentWinRate * 100).toFixed(1)}%` : '0%'}
                        </div>
                        <div className="text-xs text-gray-500">
                          Close Rate: {campaignAnalytics?.closeRate ? `${(campaignAnalytics.closeRate * 100).toFixed(1)}%` : '0%'}
                        </div>
                      </div>
                      
                      {/* CAC */}
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600 dark:text-gray-400">CAC</div>
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-bold">
                          {campaignAnalytics?.cac ? `$${Math.round(campaignAnalytics.cac).toLocaleString()}` : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">Cost per acquisition</div>
                      </div>
                    </div>
                  </div>

                  {/* Pipeline Walk Chart */}
                  <div className="mb-6">
                    <PipelineWalkChart 
                      campaignId={selectedCampaign.id} 
                      campaignName={selectedCampaign.name}
                    />
                  </div>

                  {/* Stage Movements Card */}
                  <div className="mb-6">
                    <StageMovementsCard 
                      campaignId={selectedCampaign.id} 
                      campaignName={selectedCampaign.name}
                    />
                  </div>

                  {/* Pipeline by Owner Card */}
                  <div className="mb-6">
                    <PipelineByOwnerCard 
                      campaignId={selectedCampaign.id}
                    />
                  </div>

                  {/* Campaign Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Campaign Details</h3>
                    <div className="prose dark:prose-invert max-w-none">
                      <p>{selectedCampaign.description || 'No description available'}</p>
                      {selectedCampaign.notes && (
                        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <strong>Notes:</strong>
                          <p className="mt-2">{selectedCampaign.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Lists */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Closed Won Customers */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">New Closed Won Customers</CardTitle>
                        <CardDescription>
                          Customers who are "Closed Won" and were NOT already "Closed Won" when added to campaign
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {closedWonCustomers.length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground">
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No new closed won customers yet</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {closedWonCustomers.map((customer: any) => (
                              <div key={customer.opportunityId} className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                <div>
                                  <div className="font-medium text-green-900 dark:text-green-100">
                                    {customer.customerName}
                                  </div>
                                  <div className="text-sm text-green-700 dark:text-green-300">
                                    {customer.stage} • ${customer.year1Arr?.toLocaleString() || '0'} Year 1 ARR
                                  </div>
                                  <div className="text-xs text-green-600 dark:text-green-400">
                                    Closed: {new Date(customer.snapshotDate).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Active Pipeline Customers */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Active Pipeline Customers</CardTitle>
                        <CardDescription>
                          Customers with pipeline entry who are not Closed Won/Lost and were not pre-existing Closed Won
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {pipelineCustomers.length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground">
                            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No active pipeline customers</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {pipelineCustomers.map((customer: any) => (
                              <div key={customer.opportunityId} className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div>
                                  <div className="font-medium text-blue-900 dark:text-blue-100">
                                    {customer.customerName}
                                  </div>
                                  <div className="text-sm text-blue-700 dark:text-blue-300">
                                    {customer.stage} • ${customer.year1Arr?.toLocaleString() || '0'} Year 1 ARR
                                  </div>
                                  <div className="text-xs text-blue-600 dark:text-blue-400">
                                    {customer.closeDate 
                                      ? `Expected close date: ${new Date(customer.closeDate).toLocaleDateString()}`
                                      : 'No expected close date set'
                                    }
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>


                </TabsContent>

                <TabsContent value="customers" className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Campaign Customers</h3>
                    <Button onClick={() => setShowCustomerForm(true)} size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Customer
                    </Button>
                  </div>

                  <CampaignCustomersList campaignId={selectedCampaign.id} />
                </TabsContent>

                <TabsContent value="team" className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Team Members</h3>
                  </div>

                  {/* Add Team Member Form */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                    <div>
                      <Label htmlFor="teamMemberName" className="text-sm font-medium">Name</Label>
                      <Input
                        id="teamMemberName"
                        placeholder="Enter name"
                        className="mt-1"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="teamMemberRole" className="text-sm font-medium">Role</Label>
                      <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sales">Sales</SelectItem>
                          <SelectItem value="Marketing">Marketing</SelectItem>
                          <SelectItem value="Engineering">Engineering</SelectItem>
                          <SelectItem value="Customer Success">Customer Success</SelectItem>
                          <SelectItem value="Leadership">Leadership</SelectItem>
                          <SelectItem value="Product">Product</SelectItem>
                          <SelectItem value="Support">Support</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end gap-2">
                      <Button 
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                        onClick={addTeamMember}
                        disabled={!newMemberName.trim() || !newMemberRole.trim() || updateTeamMutation.isPending}
                      >
                        {updateTeamMutation.isPending ? "Adding..." : "Add"}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={clearTeamForm}
                        disabled={updateTeamMutation.isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>

                  {/* Team Members List */}
                  {selectedCampaign.teamAttendees && selectedCampaign.teamAttendees.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-md font-semibold text-gray-900 dark:text-white">Current Team Members</h4>
                      <div className="space-y-2">
                        {selectedCampaign.teamAttendees.map((member: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <Users className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {member.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {member.role}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="secondary" 
                                className={
                                  member.role === 'Sales' ? 'bg-green-100 text-green-800' :
                                  member.role === 'Marketing' ? 'bg-purple-100 text-purple-800' :
                                  member.role === 'Engineering' ? 'bg-blue-100 text-blue-800' :
                                  member.role === 'Leadership' ? 'bg-yellow-100 text-yellow-800' :
                                  member.role === 'Customer Success' ? 'bg-teal-100 text-teal-800' :
                                  member.role === 'Product' ? 'bg-orange-100 text-orange-800' :
                                  member.role === 'Support' ? 'bg-pink-100 text-pink-800' :
                                  'bg-gray-100 text-gray-800'
                                }
                              >
                                {member.role}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeTeamMember(index)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
                                disabled={updateTeamMutation.isPending}
                                title="Remove team member"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Team Performance Preview */}
                  {selectedCampaign.teamAttendees && selectedCampaign.teamAttendees.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Team Performance Tracking
                        </CardTitle>
                        <CardDescription>
                          View detailed team member performance in Marketing Comparative Analytics
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              Advanced Team Analytics Available
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Track ROI, pipeline effectiveness, and individual contribution across campaigns
                            </p>
                          </div>
                          <Button asChild>
                            <a href="/marketing-comparative">
                              <BarChart3 className="w-4 h-4 mr-2" />
                              View Analytics
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

              </Tabs>
            ) : (
              <div className="text-center py-12">
                <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Select a Campaign
                </h3>
                <p className="text-gray-500 mb-6">
                  Choose a campaign from the list to view detailed analytics and performance metrics.
                </p>
                {campaigns.length === 0 && (
                  <Button onClick={() => setShowCreateForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Campaign
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingCampaign} onOpenChange={() => setDeletingCampaign(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCampaign?.name}"? This will also remove all customer associations with this campaign. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCampaign && deleteMutation.mutate(deletingCampaign.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Campaign"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Customer to Campaign Form */}
      {showCustomerForm && selectedCampaign && (
        <CustomerToCampaignForm
          campaignId={selectedCampaign.id}
          onClose={() => setShowCustomerForm(false)}
          onSuccess={() => {
            setShowCustomerForm(false);
            queryClient.invalidateQueries({ queryKey: ['/api/marketing/campaigns'] });
          }}
        />
      )}
    </div>
  );
}