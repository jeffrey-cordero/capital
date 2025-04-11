import { Box, Container, Grow } from "@mui/material";
import Grid from "@mui/material/Grid2";

import ExportAccount from "@/components/dashboard/settings/export";
import DetailsForm from "@/components/dashboard/settings/form";

/**
 * The settings page component.
 *
 * @returns {React.ReactNode} The settings page component
 */
export default function Page(): React.ReactNode {
   return (
      <Container
         maxWidth = "xl"
         sx = { { textAlign: "center", pt: 6, pb: 4, px: 2 } }
      >
         <Grid
            container = { true }
            rowSpacing = { 6 }
            sx = { { width: "100%", height: "100%" } }
         >
            <Grow
               in = { true }
               mountOnEnter = { true }
               style = { { transformOrigin: "center top" } }
               timeout = { 1000 }
               unmountOnExit = { true }
            >
               <Grid size = { { xs: 12 } }>
                  <Box
                     alt = "Settings"
                     component = "img"
                     src = "/svg/settings.svg"
                     sx = { { height: 205, mb: 4 } }
                  />
                  <DetailsForm />
                  <ExportAccount />
               </Grid>
            </Grow>
         </Grid>
      </Container>
   );
}