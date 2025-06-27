import { useQuery } from "@tanstack/react-query";

interface UserPermissions {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
    isActive: number;
    roleInfo?: {
      name: string;
      displayName: string;
      permissions: string[];
    };
  };
  permissions: string[];
  isAdmin: boolean;
}

// Permission definitions with descriptions
export const PERMISSIONS = {
  pipeline: 'Pipeline Analytics',
  marketing: 'Marketing Analytics', 
  sales: 'Sales Analytics',
  people_ops: 'People Ops Analytics',
  database: 'Database Management',
  settings: 'System Settings',
  user_management: 'User Management',
  financial: 'Financial Data',
  reporting: 'Advanced Reporting'
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function usePermissions() {
  const { data, isLoading, error } = useQuery<UserPermissions>({
    queryKey: ['/api/users/me'],
    retry: false,
  });

  // Check if user is inactive
  const isInactive = data?.user && !data.user.isActive;

  const hasPermission = (permission: Permission): boolean => {
    if (!data || isInactive) return false;
    return data.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    if (!data || isInactive) return false;
    return permissions.some(p => data.permissions.includes(p));
  };

  const canAccessPage = (page: string): boolean => {
    if (isInactive) return false;
    switch (page) {
      case 'dashboard':
      case 'pipeline':
        return hasPermission('pipeline');
      case 'marketing':
        return hasPermission('marketing');
      case 'sales':
        return hasPermission('sales');
      case 'people-ops':
        return hasPermission('people_ops');
      case 'database':
        return hasPermission('database');
      case 'settings':
        return hasPermission('settings');
      case 'user-management':
        return hasPermission('user_management');
      default:
        return true; // Default pages are accessible to all
    }
  };

  return {
    user: data?.user,
    permissions: data?.permissions || [],
    isAdmin: data?.isAdmin || false,
    isLoading,
    error,
    isInactive,
    hasPermission,
    hasAnyPermission,
    canAccessPage,
  };
}