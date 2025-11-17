import { faToolbox } from "@fortawesome/free-solid-svg-icons";
import { Stack } from "@mui/material";

import DeleteAccount from "@/components/dashboard/settings/delete";
import ExportAccount from "@/components/dashboard/settings/export";
import Logout from "@/components/dashboard/settings/logout";
import Section from "@/components/global/section";

/**
 * Groups account management actions in the settings panel
 *
 * @returns {React.ReactNode} Component with export, logout, and delete account buttons
 */
export default function Actions(): React.ReactNode {
   return (
      <Section
         dataTestId = "settings-actions"
         icon = { faToolbox }
      >
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