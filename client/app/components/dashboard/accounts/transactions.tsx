import { Box, Typography } from "@mui/material";

interface TransactionProps {
   filter?: "account" | "budget";
   identifier?: string;
}

export default function Transactions({ filter, identifier }: TransactionProps) {
   return (
      <Box sx = { { textAlign: "center" } }>
         {
            !filter && (
               <Box className = "animation-container">
                  <Box
                     alt = "Transactions"
                     className = "floating"
                     component = "img"
                     src = "/svg/transactions.svg"
                     sx = { { width: 300, height: "auto", mt: 8, mb: 4 } }
                  />
               </Box>
            )
         }
         <Box>
            <Typography
               fontWeight = "bold"
               variant = "body1"
            >
               (Coming Soon)
            </Typography>
            <Typography
               fontWeight = "bold"
               variant = "body1"
            >
               { filter } { identifier }
            </Typography>
         </Box>
      </Box>
   );
}