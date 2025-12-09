import { CircularProgress } from "@mui/material";

/**
 * Loading indicator component for async operations and page loading
 *
 * @returns {React.ReactNode} The Loading component
 */
export default function Loading(): React.ReactNode {
   return (
      <div className = "center">
         <CircularProgress
            color = "primary"
            data-testid = "loading-spinner"
         />
      </div>
   );
}