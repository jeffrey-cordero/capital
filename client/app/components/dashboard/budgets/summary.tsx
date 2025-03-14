import { faAnglesLeft, faAnglesRight, faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   LinearProgress,
   MobileStepper,
   Stack,
   Typography
} from "@mui/material";
import { type OrganizedBudgets } from "capital/budgets";
import { useState } from "react";

import { displayCurrency } from "@/lib/display";

export function BudgetSummary({ budgets }: { budgets: OrganizedBudgets }) {
   const [activeStep, setActiveStep] = useState(0);

   return (
      <Box>
         { /* Choose a month and year to view the budget for */ }
         <MobileStepper
            activeStep = { activeStep }
            backButton = {
               <FontAwesomeIcon
                  className = "primary"
                  icon = { faAnglesLeft }
                  size = "lg"
                  style = { { cursor: "pointer" } }
               />
            }
            nextButton = {
               <FontAwesomeIcon
                  className = "primary"
                  icon = { faAnglesRight }
                  size = "lg"
                  style = { { cursor: "pointer" } }
               />
            }
            position = "static"
            steps = { 12 }
            sx = { { width: "100%", py: 2 } }
            variant = "dots"
         />
         { /* Income and Expenses */ }
         <Stack
            direction = "column"
            spacing = { 0.5 }
         >
            <Stack
               direction = "row"
               sx = { { justifyContent: "space-between" } }
            >
               <Stack
                  direction = "row"
                  spacing = { 1 }
                  sx = { { alignItems: "center" } }
               >
                  <Typography variant = "h6">
                     Income
                  </Typography>
                  <FontAwesomeIcon
                     className = "primary"
                     icon = { faPenToSquare }
                     size = "lg"
                     style = { { cursor: "pointer" } }
                  />
               </Stack>
               <Typography variant = "h6">
                  $0.00 / { displayCurrency(budgets.Income.goals[0]?.goal || 0) }
               </Typography>
            </Stack>
            <LinearProgress
               color = "success"
               sx = {
                  {
                     height: "1.5rem",
                     borderRadius: "12px"
                  }
               }
               value = { 90 }
               variant = "determinate"
            />
         </Stack>
      </Box>
   );
}