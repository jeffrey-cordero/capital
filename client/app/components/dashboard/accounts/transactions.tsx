import { Box, Typography } from "@mui/material";

export default function Transactions() {
   return (
      <Box>
         <Box className = "animation-container">
            <Box
               alt = "Transactions"
               className = "floating"
               component = "img"
               src = "/svg/transactions.svg"
               sx = { { width: 300, height: "auto", mt:8, mb: 5 } }
            />
         </Box>
         <Box>
            <Typography
               fontWeight = "bold"
               variant = "body1"
            >
               Coming Soon
            </Typography>
         </Box>
      </Box>
   );
}