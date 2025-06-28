import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus } from "lucide-react";

const campaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  type: z.string().min(1, "Campaign type is required"),
  startDate: z.string().min(1, "Start date is required"),
  influence: z.string().optional(),
  cost: z.number().optional(),
  notes: z.string().optional(),
  salesforceUrl: z.string().optional(),
  status: z.string().min(1, "Status is required"),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

interface Campaign {
  id: number;
  name: string;
  type: string;
  startDate: string;
  influence?: string;
  cost?: number;
  notes?: string;
  salesforceUrl?: string;
  status?: string;
}

interface CampaignFormProps {
  campaign?: Campaign;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CampaignForm({ campaign, onClose, onSuccess }: CampaignFormProps) {
  const [cost, setCost] = useState(campaign?.cost?.toString() || "");
  const [showNewTypeInput, setShowNewTypeInput] = useState(false);
  const [showNewInfluenceInput, setShowNewInfluenceInput] = useState(false);
  const [newType, setNewType] = useState("");
  const [newInfluence, setNewInfluence] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!campaign;

  // Fetch campaign types
  const { data: campaignTypes = [] } = useQuery({
    queryKey: ['/api/marketing/settings/campaign-types'],
  });

  // Fetch influence methods
  const { data: influenceMethods = [] } = useQuery({
    queryKey: ['/api/marketing/settings/influence-methods'],
  });

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: campaign?.name || "",
      type: campaign?.type || "",
      startDate: campaign?.startDate?.split('T')[0] || "",
      influence: campaign?.influence || "",
      cost: campaign?.cost || undefined,
      notes: campaign?.notes || "",
      salesforceUrl: campaign?.salesforceUrl || "",
      status: campaign?.status || "active",
    },
  });

  // Mutations for adding new types and methods
  const addTypeMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch('/api/marketing/settings/campaign-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error('Failed to add campaign type');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/settings/campaign-types'] });
      setNewType("");
      setShowNewTypeInput(false);
    },
  });

  const addInfluenceMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch('/api/marketing/settings/influence-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error('Failed to add influence method');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/settings/influence-methods'] });
      setNewInfluence("");
      setShowNewInfluenceInput(false);
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      const payload = {
        ...data,
        cost: cost ? parseFloat(cost) : undefined,
      };

      const url = isEditing 
        ? `/api/marketing/campaigns/${campaign.id}`
        : '/api/marketing/campaigns';
      
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'create'} campaign`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/campaigns'] });
      toast({
        title: isEditing ? "Campaign updated" : "Campaign created",
        description: `The campaign has been successfully ${isEditing ? 'updated' : 'created'}.`,
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} campaign.`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CampaignFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Campaign" : "Create New Campaign"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update the campaign details below."
              : "Enter the details for your new marketing campaign."
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Campaign Name</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="e.g., Q1 Product Launch Event"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Campaign Type</Label>
            <div className="flex gap-2">
              <Select 
                value={form.watch("type")} 
                onValueChange={(value) => {
                  if (value === "__ADD_NEW__") {
                    setShowNewTypeInput(true);
                  } else {
                    form.setValue("type", value);
                  }
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select campaign type" />
                </SelectTrigger>
                <SelectContent>
                  {campaignTypes.map((type: any) => (
                    <SelectItem key={type.id} value={type.name}>
                      {type.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="__ADD_NEW__">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add New Type...
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {showNewTypeInput && (
              <div className="flex gap-2">
                <Input
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  placeholder="Enter new campaign type"
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => addTypeMutation.mutate(newType)}
                  disabled={!newType.trim() || addTypeMutation.isPending}
                >
                  Add
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowNewTypeInput(false);
                    setNewType("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
            
            {form.formState.errors.type && (
              <p className="text-sm text-red-500">{form.formState.errors.type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              {...form.register("startDate")}
            />
            {form.formState.errors.startDate && (
              <p className="text-sm text-red-500">{form.formState.errors.startDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="influence">Influence Method</Label>
            <div className="flex gap-2">
              <Select 
                value={form.watch("influence") || ""} 
                onValueChange={(value) => {
                  if (value === "__ADD_NEW__") {
                    setShowNewInfluenceInput(true);
                  } else {
                    form.setValue("influence", value);
                  }
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select influence method" />
                </SelectTrigger>
                <SelectContent>
                  {influenceMethods.map((method: any) => (
                    <SelectItem key={method.id} value={method.name}>
                      {method.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="__ADD_NEW__">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add New Method...
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {showNewInfluenceInput && (
              <div className="flex gap-2">
                <Input
                  value={newInfluence}
                  onChange={(e) => setNewInfluence(e.target.value)}
                  placeholder="Enter new influence method"
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => addInfluenceMutation.mutate(newInfluence)}
                  disabled={!newInfluence.trim() || addInfluenceMutation.isPending}
                >
                  Add
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowNewInfluenceInput(false);
                    setNewInfluence("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost">Campaign Cost (Optional)</Label>
            <Input
              id="cost"
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
            />
            <p className="text-xs text-muted-foreground">
              Used for calculating Customer Acquisition Cost (CAC)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select 
              value={form.watch("status")} 
              onValueChange={(value) => form.setValue("status", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              {...form.register("notes")}
              placeholder="Additional campaign details..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="salesforceUrl">Salesforce Campaign URL (Optional)</Label>
            <Input
              id="salesforceUrl"
              {...form.register("salesforceUrl")}
              placeholder="https://higharc.my.salesforce.com/..."
              type="url"
            />
            <p className="text-xs text-muted-foreground">
              Link to the Salesforce campaign page for easy reference
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending 
                ? (isEditing ? "Updating..." : "Creating...") 
                : (isEditing ? "Update Campaign" : "Create Campaign")
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}