import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface InfluenceMethod {
  id: number;
  name: string;
  isActive: number;
}

export default function InfluenceMethodsManagement() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingMethod, setEditingMethod] = useState<InfluenceMethod | null>(null);
  const [deletingMethod, setDeletingMethod] = useState<InfluenceMethod | null>(null);
  const [newMethodName, setNewMethodName] = useState("");
  const [editMethodName, setEditMethodName] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch influence methods
  const { data: influenceMethods = [], isLoading } = useQuery<InfluenceMethod[]>({
    queryKey: ['/api/marketing/settings/influence-methods'],
  });

  // Create influence method mutation
  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest('/api/marketing/settings/influence-methods', {
        method: 'POST',
        body: { name },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/settings/influence-methods'] });
      setShowCreateDialog(false);
      setNewMethodName("");
      toast({
        title: "Success",
        description: "Influence method created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create influence method",
        variant: "destructive",
      });
    },
  });

  // Update influence method mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      return apiRequest(`/api/marketing/settings/influence-methods/${id}`, {
        method: 'PUT',
        body: { name },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/settings/influence-methods'] });
      setEditingMethod(null);
      setEditMethodName("");
      toast({
        title: "Success",
        description: "Influence method updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update influence method",
        variant: "destructive",
      });
    },
  });

  // Delete influence method mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/marketing/settings/influence-methods/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/settings/influence-methods'] });
      setDeletingMethod(null);
      toast({
        title: "Success",
        description: "Influence method deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete influence method",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!newMethodName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a method name",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(newMethodName.trim());
  };

  const handleEdit = (method: InfluenceMethod) => {
    setEditingMethod(method);
    setEditMethodName(method.name);
  };

  const handleUpdate = () => {
    if (!editMethodName.trim() || !editingMethod) {
      toast({
        title: "Error",
        description: "Please enter a method name",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({
      id: editingMethod.id,
      name: editMethodName.trim(),
    });
  };

  const handleDelete = (method: InfluenceMethod) => {
    setDeletingMethod(method);
  };

  const confirmDelete = () => {
    if (deletingMethod) {
      deleteMutation.mutate(deletingMethod.id);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Influence Methods
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading influence methods...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Influence Methods
            </CardTitle>
            <CardDescription>
              Manage the available influence methods for marketing campaigns
            </CardDescription>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Method
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Influence Method</DialogTitle>
                <DialogDescription>
                  Add a new influence method that can be used in marketing campaigns.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="method-name">Method Name</Label>
                  <Input
                    id="method-name"
                    value={newMethodName}
                    onChange={(e) => setNewMethodName(e.target.value)}
                    placeholder="Enter influence method name"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCreate();
                      }
                    }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreate}
                  disabled={createMutation.isPending || !newMethodName.trim()}
                >
                  {createMutation.isPending ? "Creating..." : "Create Method"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {influenceMethods.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No influence methods found</p>
            <p className="text-sm">Add your first influence method to get started</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {influenceMethods.map((method) => (
                <TableRow key={method.id}>
                  <TableCell className="font-medium">{method.name}</TableCell>
                  <TableCell>
                    <Badge variant={method.isActive ? "default" : "secondary"}>
                      {method.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(method)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(method)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editingMethod} onOpenChange={() => setEditingMethod(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Influence Method</DialogTitle>
            <DialogDescription>
              Update the name of this influence method.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-method-name">Method Name</Label>
              <Input
                id="edit-method-name"
                value={editMethodName}
                onChange={(e) => setEditMethodName(e.target.value)}
                placeholder="Enter influence method name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUpdate();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMethod(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdate}
              disabled={updateMutation.isPending || !editMethodName.trim()}
            >
              {updateMutation.isPending ? "Updating..." : "Update Method"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingMethod} onOpenChange={() => setDeletingMethod(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Influence Method</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingMethod?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Method"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}