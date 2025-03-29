import { CircularProgress } from "@mui/material";

/**
 * The Loading component within the layout pages during data loading.
 *
 * @returns {React.ReactNode} The Loading component
 */
export default function Loading(): React.ReactNode {
   return (
      <div className = "center">
         <CircularProgress color = "primary" />
      </div>
   );
}