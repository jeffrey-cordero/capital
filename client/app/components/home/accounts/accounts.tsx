import { Box } from "@mui/material";

import Account from "@/components/home/accounts/account";

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
         <Box>
            <Account />
         </Box>
      </Box>
   );
}