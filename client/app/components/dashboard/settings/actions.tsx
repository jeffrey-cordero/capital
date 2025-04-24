import { faToolbox } from "@fortawesome/free-solid-svg-icons";
import { Stack } from "@mui/material";

import DeleteAccount from "@/components/dashboard/settings/delete";
import ExportAccount from "@/components/dashboard/settings/export";
import Logout from "@/components/dashboard/settings/logout";
import { Section } from "@/components/global/modal";

/**
 * Actions component for conducting account actions
 *
 * @returns {React.ReactNode} The Actions component
 */
export default function Actions(): React.ReactNode {
   return (
      <Section icon = { faToolbox }>
         <Stack
            direction = "column"
            spacing = { 1 }
            sx = { { mt: 2, width: "100%", textAlign: "center", alignItems: "center" } }
         >
            <ExportAccount />
            <Logout />
            <DeleteAccount />
         </Stack>
      </Section>
   );
}