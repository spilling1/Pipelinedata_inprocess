import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: (failureCount, error: any) => {
      // Retry up to 3 times for 401 errors
      if (error?.status === 401 && failureCount < 3) {
        return true;
      }
      return false;
    },
    retryDelay: 1000,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}