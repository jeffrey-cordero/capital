import { Box } from "@mui/material";

export default function Transactions() {
   return (
      <Box
         id = "transactions"
      >
         <Box className = "animation-container">
            <Box
               alt = "Transactions"
               className = "floating"
               component = "img"
               src = "/svg/transactions.svg"
               sx = { { width: 400, height: "auto", mb: 6 } }
            />
         </Box>
         <Box>
            <h1>Awaiting Implementation</h1>
         </Box>
      </Box>
   );
}