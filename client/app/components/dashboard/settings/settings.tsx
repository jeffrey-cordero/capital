import { Box, Stack } from "@mui/material";

import Actions from "@/components/dashboard/settings/actions";
import Details from "@/components/dashboard/settings/details";
import Security from "@/components/dashboard/settings/security";

/**
 * Settings component for managing user settings
 *
 * @returns {React.ReactNode} The Settings component
 */
export default function Settings(): React.ReactNode {
   return (
      <Box sx = { { width: "100%" } }>
         <Stack
            direction = "column"
            spacing = { -2 }
            sx = { { py: 2 } }
         >
            <Details />
            <Security />
            <Actions />
         </Stack>
      </Box>
   );
}