import { Box } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { type Account } from "capital-types/accounts";

import AccountCard from "@/components/dashboard/accounts/account";

export default function Accounts({ accounts }: {accounts: Account[]}) {
   return (
      <Box
         id = "accounts"
      >
         <Box className = "animation-container">
            <Box
               alt = "Accounts"
               className = "floating"
               component = "img"
               src = "/svg/accounts.svg"
               sx = { { width: 250, height: "auto", mb: 6 } }
            />
         </Box>
         <Grid
            container = { true }
            spacing = { 3 }
         >
            {
               accounts.map((account) => {
                  return (
                     <AccountCard
                        account = { account }
                        key = { account.account_id }
                     />
                  );
               })
            }
         </Grid>
         <Box>
            <AccountCard
               account = { undefined }
            />
         </Box>
      </Box>
   );
}