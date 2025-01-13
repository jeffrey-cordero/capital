import { CircularProgress } from "@mui/material";

export default function Loading() {
   return (
      <div className = "main">
         <CircularProgress color = "primary" />
      </div>
   );
}