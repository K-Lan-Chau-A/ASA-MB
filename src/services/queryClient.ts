import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes fresh
      gcTime: 30 * 60 * 1000, // 30 minutes cache
      retry: 1,
      refetchOnReconnect: true,
      refetchOnMount: false,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});


