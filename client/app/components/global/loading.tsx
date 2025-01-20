import { CircularProgress } from "@mui/material";

export default function Loading() {
   return (
      <div className = "center">
         <CircularProgress color = "primary" />
      </div>
   );
}