import { Box, Stack } from "@mui/material";

import Actions from "@/components/dashboard/settings/actions";
import Details from "@/components/dashboard/settings/details";
import Security from "@/components/dashboard/settings/security";

/**
 * User settings dashboard with personal, security, and account sections
 *
 * @returns {React.ReactNode} Settings management interface
 */
export default function Settings(): React.ReactNode {
   return (
      <Box sx = { { width: "100%" } }>
         <Stack
            direction = "column"
            spacing = { 4 }
            sx = { { py: 2 } }
         >
            <Details />
            <Security />
            <Box data-testid = "actions-section">
               <Actions />
            </Box>
         </Stack>
      </Box>
   );
}