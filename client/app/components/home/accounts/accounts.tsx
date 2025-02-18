import Grid from "@mui/material/Grid2";
import { Box } from "@mui/material";
import type { Account } from "capital-types/accounts";

import AccountCard from "@/components/home/accounts/account";
const images = ["property", "bank", "cash", "credit", "investment", "loan", "retirement", "savings"];

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
                              account_id: `${index}`,
                              user_id: "1",
                              account_order: index,
                              name: image,
                              type: "asset",
                              image: `/images/${image}.png`,
                              lastUpdated: "September 14, 2023",
                              history: [
                                 {
                                    month: "January",
                                    year: "2023",
                                    amount: 1000
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