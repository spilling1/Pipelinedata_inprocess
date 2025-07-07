import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { SalesFilterState } from '@/types/sales';

export function useSalesData(filters: SalesFilterState) {
  const queryClient = useQueryClient();

  // Build query parameters for sales-specific endpoints
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        if (value.length > 0) {
          queryParams.append(key, value.join(','));
        }
      } else {
        queryParams.append(key, value.toString());
      }
    }
  });

  const opportunitiesQuery = useQuery({
    queryKey: ['/api/sales/opportunities', filters],
    queryFn: async () => {
      const response = await fetch(`/api/sales/opportunities?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch opportunities');
      return response.json();
    },
    staleTime: 0, // No cache - always fetch fresh data for testing
  });

  const analyticsQuery = useQuery({
    queryKey: ['/api/sales/analytics', filters],
    queryFn: async () => {
      const response = await fetch(`/api/sales/analytics?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    },
    staleTime: 0, // No cache - always fetch fresh data for testing
  });



  const salesRepsQuery = useQuery({
    queryKey: ['/api/sales/reps'],
    staleTime: 300000, // 5 minutes - sales reps don't change often
  });

  return {
    opportunities: opportunitiesQuery.data || [],
    analytics: analyticsQuery.data,
    salesReps: salesRepsQuery.data || [],
    isLoading: opportunitiesQuery.isLoading || analyticsQuery.isLoading,
    error: opportunitiesQuery.error || analyticsQuery.error,
    refetch: () => {
      opportunitiesQuery.refetch();
      analyticsQuery.refetch();
      salesRepsQuery.refetch();
    }
  };
}