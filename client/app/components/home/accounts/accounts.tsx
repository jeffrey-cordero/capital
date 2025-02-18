import { Box } from "@mui/material";
import type { Account } from "capital-types/accounts";

import AccountCard from "@/components/home/accounts/account";

const images = ["property", "bank", "cash", "credit", "investment", "loan", "retirement", "savings"];
// const data: Account[] = [
//    {
//       account_id: "1",
//       user_id: "1",
//       name: "Property",
//       type: "asset",
//       lastUpdated: "September 14, 2023",
//       image: "/images/property.png",
//       history: [
//          {
//             month: "January",
//             year: "2023",
//             amount: 1000
//          }
//       ],
//       account_order: 1
//    },
//    {
//       name: "Bank",
//       lastUpdated: "September 14, 2023",
//       image: "/images/bank.png",
//    },
//    {
//       name: "Cash",
//       lastUpdated: "September 14, 2023",
//       image: "/images/cash.png",
//       balance: 200
//    },
//    {
//       name: "Credit",
//       lastUpdated: "September 14, 2023",
//       image: "/images/credit.png",
//       salesPrice: 285,
//       balance: 345,
//       rating: 2
//    }, {
//       name: "Investment",
//       lastUpdated: "September 14, 2023",
//       image: "/images/investment.png",
//       balance: 500
//    }, {
//       name: "Loan",
//       lastUpdated: "September 14, 2023",
//       image: "/images/loan.png",
//       balance: 1000
//    }, {
//       name: "Retirement",
//       lastUpdated: "September 14, 2023",
//       image: "/images/retirement.png",
//       balance: 2000
//    }, {
//       // savings
//       name: "Savings",
//       lastUpdated: "September 14, 2023",
//       image: "/images/savings.png",
//       balance: 1000
//    }
// ];

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
         </Box>
      </Box>
   );
}