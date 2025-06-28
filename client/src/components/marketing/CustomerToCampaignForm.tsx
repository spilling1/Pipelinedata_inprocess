import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const customerToCampaignSchema = z.object({
  customerId: z.string().min(1, "Please select a customer"),
  snapshotDate: z.string().min(1, "Please select a snapshot date"),
  attendees: z.string().optional(),
});

type CustomerToCampaignData = z.infer<typeof customerToCampaignSchema>;

interface CustomerToCampaignFormProps {
  campaignId: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface Campaign {
  id: number;
  name: string;
  type: string;
  startDate: string;
  influence?: string;
  cost?: number;
  notes?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function CustomerToCampaignForm({
  campaignId,
  onClose,
  onSuccess,
}: CustomerToCampaignFormProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [snapshotPreview, setSnapshotPreview] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState<CustomerToCampaignData | null>(null);
  const [snapshotInfo, setSnapshotInfo] = useState<{
    requestedDate: string;
    actualDate: string;
  } | null>(null);
  const { toast } = useToast();

  // Fetch campaign details to get start date
  const { data: campaignData } = useQuery<Campaign>({
    queryKey: [`/api/marketing/campaigns/${campaignId}`],
  });

  // Fetch available customers
  const { data: availableCustomers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['/api/marketing/customers/recent'],
  });

  // Preview mutation to check snapshot date
  const previewMutation = useMutation({
    mutationFn: async (data: { customerId: string; snapshotDate: string }) => {
      const response = await fetch(`/api/marketing/campaigns/${campaignId}/customers/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: data.customerId,
          snapshotDate: data.snapshotDate,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to preview customer data');
      }
      return response.json();
    },
  });

  // Add customer mutation
  const addCustomerMutation = useMutation({
    mutationFn: async (data: CustomerToCampaignData) => {
      const response = await fetch(`/api/marketing/campaigns/${campaignId}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          opportunityId: parseInt(data.customerId),
          snapshotDate: data.snapshotDate,
          attendees: data.attendees ? parseInt(data.attendees) : null,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add customer');
      }
      return response.json();
    },
    onSuccess: () => {
      // Auto-refresh customer lists
      queryClient.invalidateQueries({ queryKey: [`/api/marketing/campaigns/${campaignId}/customers`] });
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/analytics/campaign'] });
      
      toast({
        title: "Customer added",
        description: "Customer has been successfully associated with the campaign.",
      });
      onSuccess();
      setIsOpen(false);
    },
    onError: (error) => {
      console.error('Error adding customer to campaign:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add customer to campaign.",
        variant: "destructive",
      });
    },
  });

  // Calculate default snapshot date - use campaign start date if available, otherwise today
  const getDefaultSnapshotDate = () => {
    if (campaignData?.startDate) {
      // Handle timezone properly to get the correct date
      const date = new Date(campaignData.startDate);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return new Date().toISOString().split('T')[0];
  };

  const form = useForm<CustomerToCampaignData>({
    resolver: zodResolver(customerToCampaignSchema),
    defaultValues: {
      customerId: "",
      snapshotDate: getDefaultSnapshotDate(),
    },
  });

  // Update snapshot date when campaign data loads
  useEffect(() => {
    if (campaignData?.startDate) {
      // Handle timezone properly to get the correct date
      const date = new Date(campaignData.startDate);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const campaignStartDate = `${year}-${month}-${day}`;
      form.setValue('snapshotDate', campaignStartDate);
    }
  }, [campaignData?.startDate, form]);

  const handleSubmit = async (data: CustomerToCampaignData) => {
    // First, check if the actual snapshot date differs from requested date
    try {
      const previewResult = await previewMutation.mutateAsync(data);
      const requestedDate = new Date(data.snapshotDate).toISOString().split('T')[0];
      const actualDate = new Date(previewResult.actualSnapshotDate).toISOString().split('T')[0];
      
      if (requestedDate !== actualDate) {
        // Show confirmation dialog
        setPendingSubmission(data);
        setSnapshotInfo({
          requestedDate: requestedDate,
          actualDate: actualDate
        });
        setShowConfirmDialog(true);
      } else {
        // Dates match, proceed directly
        addCustomerMutation.mutate(data);
      }
    } catch (error) {
      // If preview fails, proceed with normal submission (fallback)
      addCustomerMutation.mutate(data);
    }
  };

  const handleConfirmSubmission = () => {
    if (pendingSubmission) {
      addCustomerMutation.mutate(pendingSubmission);
      setShowConfirmDialog(false);
      setPendingSubmission(null);
      setSnapshotInfo(null);
    }
  };

  const handleCancelSubmission = () => {
    setShowConfirmDialog(false);
    setPendingSubmission(null);
    setSnapshotInfo(null);
  };

  // Function to update snapshot preview when customer or date changes
  const updateSnapshotPreview = async (customerId: string, snapshotDate: string) => {
    if (!customerId || !snapshotDate) {
      setSnapshotPreview(null);
      return;
    }

    try {
      const previewResult = await previewMutation.mutateAsync({
        customerId,
        snapshotDate
      });
      setSnapshotPreview(previewResult);
    } catch (error) {
      console.log('Preview not available for this date/customer combination');
      setSnapshotPreview(null);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Customer to Campaign</DialogTitle>
        </DialogHeader>
        
        {customersLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Customer</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        const customer = (availableCustomers as any[]).find((c: any) => c.opportunityId.toString() === value);
                        setSelectedCustomer(customer);
                        // Update snapshot preview when customer changes
                        const currentDate = form.getValues('snapshotDate');
                        if (currentDate) {
                          updateSnapshotPreview(value, currentDate);
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(availableCustomers as any[])
                          .filter((customer: any) => {
                            // Filter out customers with missing or invalid names
                            const clientName = customer.clientName?.trim();
                            return clientName && clientName.length > 0;
                          })
                          .sort((a, b) => (a.clientName || '').localeCompare(b.clientName || ''))
                          .map((customer: any) => (
                          <SelectItem key={customer.opportunityId} value={customer.opportunityId.toString()}>
                            <div className="flex items-center justify-between w-full py-0.5">
                              <span className="text-sm">
                                <span className="font-medium">{customer.clientName}</span> • {customer.stage} • ${customer.year1Arr?.toLocaleString() || 'N/A'}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="snapshotDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Snapshot Date</FormLabel>
                    <FormControl>
                      <input
                        type="date"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          // Update snapshot preview when date changes
                          const currentCustomer = form.getValues('customerId');
                          if (currentCustomer && e.target.value) {
                            updateSnapshotPreview(currentCustomer, e.target.value);
                          }
                        }}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="attendees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Attendees (Optional)</FormLabel>
                    <FormControl>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g., 25"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedCustomer && (
                <div className="rounded-lg border p-3 bg-muted/50">
                  <h4 className="font-medium mb-2">Customer Details Preview</h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Client:</span> {selectedCustomer.clientName}</div>
                    
                    {snapshotPreview ? (
                      // Show dynamic data from selected snapshot date
                      <>
                        <div><span className="font-medium">Stage:</span> {snapshotPreview.stage || 'N/A'}</div>
                        <div><span className="font-medium">Year 1 ARR:</span> ${snapshotPreview.year1Arr?.toLocaleString() || 'N/A'}</div>
                        <div><span className="font-medium">TCV:</span> ${snapshotPreview.tcv?.toLocaleString() || 'N/A'}</div>
                        {snapshotPreview.closeDate && (
                          <div><span className="font-medium">Close Date:</span> {new Date(snapshotPreview.closeDate).toLocaleDateString()}</div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          Data from: {new Date(snapshotPreview.actualSnapshotDate).toLocaleDateString()}
                        </div>
                      </>
                    ) : (
                      // Show latest data when no snapshot preview is available
                      <>
                        <div><span className="font-medium">Stage:</span> {selectedCustomer.stage}</div>
                        <div><span className="font-medium">Year 1 ARR:</span> ${selectedCustomer.year1Arr?.toLocaleString() || 'N/A'}</div>
                        <div><span className="font-medium">TCV:</span> ${selectedCustomer.tcv?.toLocaleString() || 'N/A'}</div>
                        {selectedCustomer.closeDate && (
                          <div><span className="font-medium">Close Date:</span> {new Date(selectedCustomer.closeDate).toLocaleDateString()}</div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          Latest available data
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addCustomerMutation.isPending}>
                  {addCustomerMutation.isPending ? "Adding..." : "Add Customer"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
      
      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Snapshot Date Mismatch</AlertDialogTitle>
            <AlertDialogDescription>
              The snapshot date you selected ({snapshotInfo?.requestedDate}) doesn't have data available. 
              The system found data from {snapshotInfo?.actualDate} instead.
              <br /><br />
              Do you want to proceed with the data from {snapshotInfo?.actualDate}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSubmission}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmission}>
              Yes, Use {snapshotInfo?.actualDate} Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}