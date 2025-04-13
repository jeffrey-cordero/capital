import { Stack } from "@mui/material";

import Details from "@/components/dashboard/settings/details";
import Security from "@/components/dashboard/settings/security";

/**
 * Settings component for managing user settings
 *
 * @returns {React.ReactNode} The Settings component
 */
export default function Settings(): React.ReactNode {
   return (
      <Stack
         direction = "column"
         spacing = { 4 }
      >
         <Details />
         <Security />
      </Stack>
   );
}