import { Paper, type SxProps } from "@mui/material";
import Grid from "@mui/material/Grid2";

interface CalloutProps {
   type: "primary" | "error";
   children: React.ReactNode;
   sx?: SxProps<any>;
}

export default function Callout({ type, children, sx }: CalloutProps) {
   return (
      <Grid
         container = { true }
         sx = { { justifyContent: "center", ...sx } }
      >
         <Grid size = { { xs:10, md: 7, lg: 5 } }>
            <Paper
               elevation = { 3 }
               sx = { { p: 3, borderTop: 8,  borderTopColor: type === "primary" ? "primary.main" : "error.main", borderRadius: "8px" } }
            >
               { children }
            </Paper>
         </Grid>
      </Grid>
   );
}