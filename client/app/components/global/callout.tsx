import { Paper, type SxProps } from "@mui/material";
import Grid from "@mui/material/Grid2";

/**
 * Props for the Callout component
 *
 * @property {React.ReactNode} children - Content to display within the callout
 * @property {SxProps<any>} [sx] - Optional additional styles
 */
interface CalloutProps {
   children: React.ReactNode;
   sx?: SxProps<any>;
}

/**
 * Styled container for highlighting important content within the initial landing pages
 *
 * @param {CalloutProps} props - Callout component props
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