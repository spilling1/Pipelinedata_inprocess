import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const editCustomerSchema = z.object({
  attendees: z.string().optional(),
  snapshotDate: z.string().optional(),
});

type EditCustomerData = z.infer<typeof editCustomerSchema>;

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
    opportunityId: string;
    name: string;
    clientName: string;
    owner: string;
    createdDate: string;
  };
}

interface EditCampaignCustomerFormProps {
  customer: CampaignCustomer;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditCampaignCustomerForm({
  customer,
  isOpen,
  onClose,
  onSuccess,
}: EditCampaignCustomerFormProps) {
  const { toast } = useToast();
  const [snapshotPreview, setSnapshotPreview] = useState<any>(null);
  
  const form = useForm<EditCustomerData>({
    resolver: zodResolver(editCustomerSchema),
    defaultValues: {
      attendees: customer.attendees?.toString() || "",
      snapshotDate: new Date(customer.snapshotDate).toISOString().split('T')[0],
    },
  });

  // Reset form when customer changes
  useEffect(() => {
    form.reset({
      attendees: customer.attendees?.toString() || "",
      snapshotDate: new Date(customer.snapshotDate).toISOString().split('T')[0],
    });
  }, [customer, form]);

  // Preview mutation for snapshot data
  const previewMutation = useMutation({
    mutationFn: async ({ snapshotDate }: { snapshotDate: string }) => {
      const response = await fetch(`/api/marketing/campaigns/${customer.campaignId}/customers/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customer.opportunityId.toString(),
          snapshotDate,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to preview snapshot data');
      }
      return response.json();
    },
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: async (data: EditCustomerData) => {
      const response = await fetch(`/api/marketing/campaigns/${customer.campaignId}/customers/${customer.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendees: data.attendees ? parseInt(data.attendees) : null,
          snapshotDate: data.snapshotDate,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update customer');
      }
      return response.json();
    },
    onSuccess: () => {
      // Refresh customer lists
      queryClient.invalidateQueries({ queryKey: [`/api/marketing/campaigns/${customer.campaignId}/customers`] });
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/campaigns'] });
      
      toast({
        title: "Customer updated",
        description: "Customer details have been successfully updated.",
      });
      onSuccess();
      onClose();
    },
    onError: (error) => {
      console.error('Error updating customer:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update customer.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: EditCustomerData) => {
    updateCustomerMutation.mutate(data);
  };

  // Function to update snapshot preview when date changes
  const updateSnapshotPreview = async (snapshotDate: string) => {
    if (!snapshotDate) {
      setSnapshotPreview(null);
      return;
    }

    try {
      const previewResult = await previewMutation.mutateAsync({ snapshotDate });
      setSnapshotPreview(previewResult);
    } catch (error) {
      console.log('Preview not available for this date');
      setSnapshotPreview(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
        </DialogHeader>
        
        <div className="rounded-lg border p-3 bg-muted/50 mb-4">
          <h4 className="font-medium mb-2">Customer Details</h4>
          <div className="space-y-1 text-sm">
            <div><span className="font-medium">Name:</span> {customer.opportunity.name}</div>
            <div><span className="font-medium">Client:</span> {customer.opportunity.clientName}</div>
            <div><span className="font-medium">Stage:</span> {customer.stage}</div>
            <div><span className="font-medium">Year 1 ARR:</span> ${customer.year1Arr?.toLocaleString() || 'N/A'}</div>
            {customer.closeDate && (
              <div><span className="font-medium">Close Date:</span> {new Date(customer.closeDate).toLocaleDateString()}</div>
            )}
            <div className="text-xs text-muted-foreground mt-1">
              Snapshot from: {new Date(customer.snapshotDate).toLocaleDateString()}
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="attendees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Attendees</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="e.g., 25"
                      {...field}
                    />
                  </FormControl>
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
                      value={field.value || ''}
                      onChange={(e) => {
                        field.onChange(e.target.value);
                        updateSnapshotPreview(e.target.value);
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {snapshotPreview && (
              <div className="rounded-lg border p-3 bg-blue-50">
                <h4 className="font-medium mb-2 text-blue-800">Preview for Selected Date</h4>
                <div className="space-y-1 text-sm text-blue-700">
                  <div><span className="font-medium">Stage:</span> {snapshotPreview.stage || 'N/A'}</div>
                  <div><span className="font-medium">Year 1 ARR:</span> ${snapshotPreview.year1Arr?.toLocaleString() || 'N/A'}</div>
                  <div><span className="font-medium">TCV:</span> ${snapshotPreview.tcv?.toLocaleString() || 'N/A'}</div>
                  {snapshotPreview.closeDate && (
                    <div><span className="font-medium">Close Date:</span> {new Date(snapshotPreview.closeDate).toLocaleDateString()}</div>
                  )}
                  <div className="text-xs text-blue-600 mt-1">
                    Data from: {new Date(snapshotPreview.actualSnapshotDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateCustomerMutation.isPending}>
                {updateCustomerMutation.isPending ? "Updating..." : "Update Customer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}