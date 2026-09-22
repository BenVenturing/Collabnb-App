import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { backendConfig, isConvexBackend } from '../config/backend';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout({children}) {
  useEffect(() => {
    if (
      import.meta.env.DEV &&
      isConvexBackend &&
      !backendConfig.convexUrl
    ) {
      console.warn(
        '[backend] VITE_BACKEND_PROVIDER is convex but VITE_CONVEX_URL is missing.'
      );
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
