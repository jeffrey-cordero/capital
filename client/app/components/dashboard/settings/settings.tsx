import { Stack } from "@mui/material";

import Actions from "@/components/dashboard/settings/actions";
import Details from "@/components/dashboard/settings/details";
import Security from "@/components/dashboard/settings/security";
import Callout from "@/components/global/callout";

/**
 * Settings component for managing user settings
 *
 * @returns {React.ReactNode} The Settings component
 */
export default function Settings(): React.ReactNode {
   return (
      <Callout
         sizes = { { xs: 12, sm: 10, xl: 8 } }
         sx = { { width: "100%", mt: 2  } }
         type = "primary"
      >
         <Stack
            direction = "column"
            spacing = { -2 }
            sx = { { py: 2 } }
         >
            <Details />
            <Security />
            <Actions />
         </Stack>
      </Callout>
   );
}