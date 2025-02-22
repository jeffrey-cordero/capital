import { Box } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { images } from "capital-types/accounts";

import AccountCard from "@/components/home/accounts/account";

export default function Accounts() {
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
               images.map((image, index) => {
                  return (
                     <AccountCard
                        account = {
                           {
                              account_id: String(index),
                              account_order: index,
                              name: image,
                              type: "asset",
                              image: `/images/${image}.png`,
                              balance: 1000,
                              history: [
                                 {
                                    balance: 1000,
                                    last_updated: new Date("01/01/2023").toISOString()
                                 }
                              ]
                           }
                        }
                        key = { index }
                     />
                  );
               })
            }
         </Grid>
      </Box>
   );
}