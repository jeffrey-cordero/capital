import {
   Box,
   LinearProgress,
   MobileStepper,
   Stack,
   Typography,
   useTheme
} from "@mui/material";
import { type OrganizedBudgets } from "capital/budgets";
import { displayCurrency } from "@/lib/display";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faAnglesLeft, faAnglesRight } from "@fortawesome/free-solid-svg-icons";

export function BudgetSummary({ budgets }: { budgets: OrganizedBudgets }) {
   const [activeStep, setActiveStep] = useState(0);
   
   return (
      <Box>
         {/* Choose a month and year to view the budget for */}
         <MobileStepper
            activeStep={activeStep}
            backButton={<FontAwesomeIcon icon={faAnglesLeft} className="primary" size="lg" style={{ cursor: "pointer" }}/>}
            nextButton={<FontAwesomeIcon icon={faAnglesRight} className="primary" size="lg" style={{ cursor: "pointer" }}/>}
            steps={12}
            position="static"
            variant="dots"
            sx={{ width: "100%", py: 2 }}
         />       
         {/* Income and Expenses */}
         <Stack direction="column" spacing={0.5}>
            <Stack direction="row" sx = {{ justifyContent: "space-between" }}>
               <Stack direction="row" spacing={1} sx = {{ alignItems: "center" }}>
               <Typography variant="h6">
                  Income
               </Typography>
               <FontAwesomeIcon icon={faPenToSquare} className="primary" size="lg" style={{ cursor: "pointer" }} />
               </Stack>
               <Typography variant="h6">
                  $0.00 / {displayCurrency(budgets.Income.goals[0]?.goal || 0)}
               </Typography>
            </Stack>
            <LinearProgress
               value={90}
               variant="determinate"
               color="success"
               sx={{
                  height: "1.5rem",
                  borderRadius: "12px",
               }}
            />
         </Stack>
      </Box>
   );
}