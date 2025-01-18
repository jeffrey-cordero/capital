
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
            <Grid size = { { xs:10, md: 6, lg: 4 } }>
               <Paper
                  elevation = { 4 }
                  sx = { { p: 3, borderTop: 5,  borderTopColor: type === "primary" ? "primary.main" : "error.main" } }
               >
                  { children }
               </Paper>
            </Grid>
         </Grid>
      </Box>
   );
}