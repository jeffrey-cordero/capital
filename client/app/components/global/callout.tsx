import { Paper, type SxProps } from "@mui/material";
import Grid from "@mui/material/Grid2";

/**
 * The props for the Callout component.
 *
 * @interface CalloutProps
 * @property {string} type - The type of callout to display
 * @property {React.ReactNode} children - The content to display within the callout
 * @property {SxProps<any>} [sx] - Optional additional MUI styles
 */
interface CalloutProps {
   type: "primary" | "error";
   children: React.ReactNode;
   sx?: SxProps<any>;
}

/**
 * The Callout component within the initial landing pages.
 *
 * @param {CalloutProps} props - The props for the Callout component
 * @returns {React.ReactNode} The Callout component
 */
export default function Callout({ type, children, sx }: CalloutProps): React.ReactNode {
   return (
      <Grid
         container = { true }
         sx = { { justifyContent: "center", ...sx } }
      >
         <Grid size = { { xs: 12, md: 8, lg: 6 } }>
            <Paper
               elevation = { 3 }
               sx = { { p: 3, borderTop: 8,  borderTopColor: type === "primary" ? "primary.main" : "error.main", borderRadius: "6px" } }
            >
               { children }
            </Paper>
         </Grid>
      </Grid>
   );
}