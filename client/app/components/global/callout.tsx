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
         <Grid size = { { xs: 12, md: 8, lg: 6 } }>
            <Paper
               elevation = { 3 }
               sx = { { p: 3, borderTop: 10,  borderTopColor: type === "primary" ? "primary.main" : "error.main", borderRadius: "6px" } }
            >
               { children }
            </Paper>
         </Grid>
      </Grid>
   );
}