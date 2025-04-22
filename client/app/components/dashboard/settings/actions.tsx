import { Box, Stack } from "@mui/material";

import DeleteAccount from "@/components/dashboard/settings/delete";
import ExportAccount from "@/components/dashboard/settings/export";
import Logout from "@/components/dashboard/settings/logout";

/**
 * Actions component for conducting account actions
 *
 * @returns {React.ReactNode} The Actions component
 */
export default function Actions(): React.ReactNode {
   return (
      <Box>
         <Stack
            direction = "column"
            spacing = { 1 }
            sx = { { mt: 10, width: "100%", textAlign: "center", alignItems: "center" } }
         >
            <Box
               alt = "Actions"
               component = "img"
               src = "/svg/actions.svg"
               sx = { { width: 305, px: 2, mb: "25px !important" } }
            />
            <ExportAccount />
            <Logout />
            <DeleteAccount />
         </Stack>
      </Box>
   );
}