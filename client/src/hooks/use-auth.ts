import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

interface SessionResponse {
  authenticated: boolean;
  user?: User;
}

export function useAuth() {
  const { data, isLoading } = useQuery<SessionResponse>({
    queryKey: ['/api/auth/session'],
    retry: false,
  });

  return {
    user: data?.user ?? null,
    isLoading,
    isAuthenticated: data?.authenticated ?? false
  };
}
