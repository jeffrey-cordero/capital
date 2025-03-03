import { Box, Chip, Divider, Typography } from "@mui/material";
import type { Account } from "capital-types/accounts";

export default function AccountTransactions({ account }: { account: Account} ) {
   return (
      <Box>
         <Divider>
            <Chip
               label = "Transactions"
            />
         </Divider>
         <Typography
            fontWeight = "bold"
            sx = { { mt: 2 } }
            variant = "subtitle2"
         >
            Coming Soon for { account.name }
         </Typography>
      </Box>
   );
}