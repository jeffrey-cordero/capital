import { Box } from "@mui/material";

export default function Transactions() {
   return (
      <Box>
         <Box className = "animation-container">
            <Box
               alt = "Transactions"
               className = "floating"
               component = "img"
               src = "/svg/transactions.svg"
               sx = { { width: 350, height: "auto", mt: 8, mb: 2 } }
            />
         </Box>
         <Box>
            <h3>Awaiting Implementation</h3>
         </Box>
      </Box>
   );
}