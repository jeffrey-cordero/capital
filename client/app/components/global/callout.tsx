
import { Box, Paper, type SxProps } from "@mui/material";
import Grid from "@mui/material/Grid2";

interface CalloutProps {
   type: "primary" | "error";
   children: React.ReactNode;
   sx?: SxProps<any>;

}

export default function Callout(props: CalloutProps) {
   const { type, children, sx } = props;

   return (
      <Box sx = { sx }>
         <Grid
            container = { true }
            justifyContent = "center"
         >
            <Grid size = { { xs:10, md:8, lg:6 } }>
               <Paper
                  elevation = { 2 }
                  sx = { { p: 4, mt: 5, borderTop: 5,  borderTopColor: type === "primary" ? "primary.main" : "error.main" } }
               >
                  { children }
               </Paper>
            </Grid>
         </Grid>
      </Box>
   );
}