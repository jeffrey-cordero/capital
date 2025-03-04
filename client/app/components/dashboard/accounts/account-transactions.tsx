import { Box, Chip, Divider, Typography } from "@mui/material";
import type { Account } from "capital/accounts";

export default function AccountTransactions({ account }: { account: Account} ) {
   return (
      <Box>
         <Divider>
            <Chip
               color = "success"
               label = "Transactions"
            />
         </Divider>
         <Typography
            fontWeight = "bold"
            sx = { { mt: 2, textAlign: "center" } }
            variant = "subtitle2"
         >
            Coming Soon
         </Typography>
      </Box>
   );
}