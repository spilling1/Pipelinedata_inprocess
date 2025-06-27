import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Users, UserPlus, Settings, Shield, ChevronLeft, RefreshCw } from "lucide-react";
import { Link } from "wouter";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: number;
  createdAt: string;
  roleInfo?: {
    displayName: string;
    permissions: string[];
  };
}

interface Role {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  permissions: string[];
}

const ROLE_OPTIONS = [
  'Admin',
  'Leadership', 
  'Marketing',
  'Ops',
  'Finance',
  'Sales',
  'Post-Sales',
  'Engineering'
];

const AVAILABLE_PERMISSIONS = [
  { key: 'pipeline', label: 'Pipeline Analytics' },
  { key: 'marketing', label: 'Marketing Analytics' },
  { key: 'sales', label: 'Sales Analytics' },
  { key: 'people_ops', label: 'People Ops Analytics' },
  { key: 'database', label: 'Database Management' },
  { key: 'settings', label: 'System Settings' },
  { key: 'user_management', label: 'User Management' },
  { key: 'financial', label: 'Financial Data' },
  { key: 'reporting', label: 'Advanced Reporting' },
];

export default function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isRoleEditDialogOpen, setIsRoleEditDialogOpen] = useState(false);

  const canManageUsers = hasPermission('user_management');

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/users/users'],
    enabled: canManageUsers,
  });

  const { data: roles, isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ['/api/users/roles'],
    enabled: canManageUsers,
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<User> }) => {
      const response = await fetch(`/api/users/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/users'] });
      toast({ title: "User updated successfully" });
      setIsEditDialogOpen(false);
      setEditingUser(null);
    },
    onError: (error) => {
      toast({ 
        title: "Error updating user", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: 'activate' | 'deactivate' }) => {
      const response = await fetch(`/api/users/users/${userId}/${action}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error(`Failed to ${action} user`);
      return response.json();
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/users'] });
      toast({ 
        title: `User ${action === 'activate' ? 'activated' : 'deactivated'} successfully` 
      });
    },
    onError: (error) => {
      toast({ 
        title: "Error updating user status", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ roleId, updates }: { roleId: number; updates: Partial<Role> }) => {
      const response = await fetch(`/api/users/roles/${roleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/roles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] }); // Refresh current user permissions
      toast({ 
        title: "Role updated successfully",
        description: "Please refresh the page to see permission changes on the dashboard"
      });
      setIsRoleEditDialogOpen(false);
      setEditingRole(null);
    },
    onError: (error) => {
      toast({ 
        title: "Error updating role", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = () => {
    if (!editingUser) return;
    
    // Only send the fields we want to update
    const updates = {
      firstName: editingUser.firstName,
      lastName: editingUser.lastName,
      role: editingUser.role,
    };
    
    updateUserMutation.mutate({ userId: editingUser.id, updates });
  };

  const handleToggleUserStatus = (userId: string, isActive: boolean) => {
    const action = isActive ? 'deactivate' : 'activate';
    toggleUserStatusMutation.mutate({ userId, action });
  };

  const handleEditRole = (role: Role) => {
    setEditingRole({ ...role });
    setIsRoleEditDialogOpen(true);
  };

  const handleRefreshPermissions = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
    toast({ title: "Permissions refreshed" });
  };

  const handleUpdateRole = () => {
    if (!editingRole) return;
    
    const updates = {
      displayName: editingRole.displayName,
      description: editingRole.description,
      permissions: editingRole.permissions,
    };
    
    updateRoleMutation.mutate({ roleId: editingRole.id, updates });
  };

  const toggleRolePermission = (permission: string) => {
    if (!editingRole) return;
    
    const currentPermissions = [...editingRole.permissions];
    const index = currentPermissions.indexOf(permission);
    
    if (index > -1) {
      currentPermissions.splice(index, 1);
    } else {
      currentPermissions.push(permission);
    }
    
    setEditingRole({
      ...editingRole,
      permissions: currentPermissions
    });
  };

  if (permissionsLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!canManageUsers) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access user management.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="w-full">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Return to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  User Management
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Manage users, roles, and permissions
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={handleRefreshPermissions}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Permissions
              </Button>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8">
          {/* Users Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Users ({users?.length || 0})
              </CardTitle>
              <CardDescription>
                Manage user accounts, roles, and access permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="text-center py-8">Loading users...</div>
              ) : (
                <div className="space-y-4">
                  {users?.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <h3 className="font-semibold">
                              {user.firstName && user.lastName 
                                ? `${user.firstName} ${user.lastName}` 
                                : user.email}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {user.email}
                            </p>
                          </div>
                          <Badge variant={user.isActive ? "default" : "secondary"}>
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline">
                            {user.roleInfo?.displayName || user.role}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant={user.isActive ? "destructive" : "default"}
                          size="sm"
                          onClick={() => handleToggleUserStatus(user.id, user.isActive === 1)}
                        >
                          {user.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Roles Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Roles Overview
              </CardTitle>
              <CardDescription>
                Current roles and their permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rolesLoading ? (
                <div className="text-center py-8">Loading roles...</div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roles?.map((role) => (
                    <Card key={role.id} className="border border-gray-200">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{role.displayName}</CardTitle>
                            <CardDescription className="text-sm">
                              {role.description}
                            </CardDescription>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditRole(role)}
                          >
                            Edit
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Permissions:</p>
                          <div className="flex flex-wrap gap-1">
                            {role.permissions.map((permission) => (
                              <Badge key={permission} variant="secondary" className="text-xs">
                                {AVAILABLE_PERMISSIONS.find(p => p.key === permission)?.label || permission}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and role assignments
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    defaultValue={editingUser.firstName || ''}
                    onChange={(e) => setEditingUser({...editingUser, firstName: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    defaultValue={editingUser.lastName || ''}
                    onChange={(e) => setEditingUser({...editingUser, lastName: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value) => setEditingUser({...editingUser, role: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isRoleEditDialogOpen} onOpenChange={setIsRoleEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Role: {editingRole?.displayName}</DialogTitle>
            <DialogDescription>
              Update role information and permissions
            </DialogDescription>
          </DialogHeader>
          {editingRole && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={editingRole.displayName}
                  onChange={(e) => setEditingRole({...editingRole, displayName: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={editingRole.description || ''}
                  onChange={(e) => setEditingRole({...editingRole, description: e.target.value})}
                />
              </div>
              <div>
                <Label>Permissions</Label>
                <div className="mt-2 space-y-2">
                  {AVAILABLE_PERMISSIONS.map((permission) => (
                    <div key={permission.key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={permission.key}
                        checked={editingRole.permissions.includes(permission.key)}
                        onChange={() => toggleRolePermission(permission.key)}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={permission.key} className="text-sm font-normal">
                        {permission.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <p className="text-sm font-medium mb-2">Selected Permissions:</p>
                <div className="flex flex-wrap gap-1">
                  {editingRole.permissions.map((permission) => (
                    <Badge key={permission} variant="secondary" className="text-xs">
                      {AVAILABLE_PERMISSIONS.find(p => p.key === permission)?.label || permission}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}