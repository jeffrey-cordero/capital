import { Box, Typography } from "@mui/material";

/**
 * Define the props for the Transactions component
 *
 * @interface TransactionProps
 * @property {string} filter - The filter to apply to the transactions
 * @property {string} identifier - The identifier to apply to the transactions
 */
interface TransactionProps {
   filter?: "account" | "budget";
   identifier?: string;
}

/**
 * The Transactions component to display the transactions
 *
 * @param {TransactionProps} props - The props for the Transactions component
 * @returns {React.ReactNode} The Transactions component
 */
export default function Transactions({ filter, identifier }: TransactionProps): React.ReactNode {
   return (
      <Box sx = { { textAlign: "center" } }>
         <Box sx = { { mt: 2 } }>
            <Typography
               fontWeight = "bold"
               variant = "body1"
            >
               Coming Soon
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