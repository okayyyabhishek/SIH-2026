"use client";

import { QueryClient } from "@tanstack/react-query";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 30, // 30 seconds
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Do not retry 4xx errors
          const code = (error as unknown as { code?: string }).code;
          if (code && code.startsWith("HTTP_4")) {
            return false;
          }
          return failureCount < 2;
        },
      },
    },
  });
}
