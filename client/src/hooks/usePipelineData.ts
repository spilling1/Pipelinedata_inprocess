import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { FilterState } from '@/types/pipeline';

export function usePipelineData(filters: FilterState) {
  const queryClient = useQueryClient();

  // Build query parameters
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value && (Array.isArray(value) ? value.length > 0 : true)) {
      if (Array.isArray(value)) {
        queryParams.append(key, value.join(','));
      } else {
        queryParams.append(key, value.toString());
      }
    }
  });

  const opportunitiesQuery = useQuery({
    queryKey: ['/api/opportunities', queryParams.toString()],
    staleTime: 30000, // 30 seconds
  });

  const analyticsQuery = useQuery({
    queryKey: ['/api/analytics', queryParams.toString()],
    staleTime: 30000, // 30 seconds
  });

  const filesQuery = useQuery({
    queryKey: ['/api/files'],
    staleTime: 60000, // 1 minute
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      
      const response = await apiRequest('POST', '/api/upload', formData);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['/api/opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
    },
  });

  return {
    opportunities: opportunitiesQuery.data || [],
    analytics: analyticsQuery.data,
    files: filesQuery.data || [],
    isLoading: opportunitiesQuery.isLoading || analyticsQuery.isLoading,
    error: opportunitiesQuery.error || analyticsQuery.error,
    uploadFiles: uploadMutation.mutate,
    uploadState: {
      isUploading: uploadMutation.isPending,
      uploadError: uploadMutation.error,
      uploadSuccess: uploadMutation.isSuccess,
    },
    refetch: () => {
      opportunitiesQuery.refetch();
      analyticsQuery.refetch();
      filesQuery.refetch();
    }
  };
}
