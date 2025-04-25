import { QueryClient } from "@tanstack/react-query";

/**
 * The React Query client for the application
 *
 * @returns {QueryClient} The query client for the application
 */
const queryClient = new QueryClient({
   defaultOptions: {
      queries: { retry: false }
   }
});

export default queryClient;