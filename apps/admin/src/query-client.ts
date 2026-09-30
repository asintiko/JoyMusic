import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@joymusic/shared";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (count, error) => {
          if (error instanceof ApiError && error.status < 500) return false;
          return count < 2;
        },
        refetchOnWindowFocus: false,
        staleTime: 15_000,
      },
    },
  });
}
