import { Box, Typography } from "@mui/material";

interface TransactionProps {
   filter?: "account" | "budget";
   identifier?: string;
}

export default function Transactions({ filter, identifier }: TransactionProps) {
   return (
      <Box sx = { { textAlign: "center" } }>
         <Box sx = { { mt: 2 } }>
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