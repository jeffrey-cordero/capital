import { QueryClient } from "@tanstack/react-query";

/**
 * The React Query client for the application
 *
 * @returns {QueryClient} The query client
 * @description
 * - The query client is used to fetch and cache data from the server
 * - No retries are allowed to prevent infinite loops
 */
const queryClient = new QueryClient({
   defaultOptions: {
      queries: {
         retry: false
      }
   }
});

export default queryClient;