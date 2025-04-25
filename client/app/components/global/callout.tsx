import { Paper, type SxProps } from "@mui/material";
import Grid from "@mui/material/Grid2";

/**
 * The props for the Callout component.
 *
 * @interface CalloutProps
 * @property {React.ReactNode} children - The content to display within the callout
 * @property {SxProps<any>} [sx] - Optional additional MUI styles
 */
interface CalloutProps {
   children: React.ReactNode;
   sx?: SxProps<any>;
}

/**
 * The Callout component within the initial landing pages.
 *
 * @param {CalloutProps} props - The props for the Callout component
 * @returns {React.ReactNode} The Callout component
 */
export default function Callout({ children, sx }: CalloutProps): React.ReactNode {
   return (
      <Grid
         container = { true }
         sx = { { justifyContent: "center", ...sx } }
      >
         <Grid size = { { xs: 12, sm: 10, md: 8, lg: 6 } }>
            <Paper
               elevation = { 3 }
               sx = { { px: { xs: 2, sm: 4 }, py: 3, borderTop: 8,  borderTopColor: "primary.main", borderRadius: "6px" } }
            >
               { children }
            </Paper>
         </Grid>
      </Grid>
   );
}