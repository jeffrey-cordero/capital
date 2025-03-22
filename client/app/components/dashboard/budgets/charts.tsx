import {
   Box,
   Stack,
   styled,
   Typography,
   useTheme
} from "@mui/material";
import { PieChart, useDrawingArea } from "@mui/x-charts";
import { type OrganizedBudget } from "capital/budgets";
import * as React from "react";
import { useSelector } from "react-redux";

import { displayCurrency } from "@/lib/display";
import type { RootState } from "@/redux/store";

interface BudgetCategory {
   name: string;
   goal: number;
   current: number;
   color: string;
}

interface StyledTextProps {
   variant: "primary" | "secondary";
}

const StyledText = styled("text", {
   shouldForwardProp: (prop) => prop !== "variant"
})<StyledTextProps>(({ theme }: any) => ({
   textAnchor: "middle",
   dominantBaseline: "central",
   fill: (theme.vars || theme).palette.text.secondary,
   variants: [
      {
         props: {
            variant: "primary"
         },
         style: {
            fontSize: theme.typography.h5.fontSize
         }
      },
      {
         props: ({ variant }) => variant !== "primary",
         style: {
            fontSize: theme.typography.body2.fontSize
         }
      },
      {
         props: {
            variant: "primary"
         },
         style: {
            fontWeight: theme.typography.h5.fontWeight
         }
      },
      {
         props: ({ variant }) => variant !== "primary",
         style: {
            fontWeight: theme.typography.body2.fontWeight
         }
      }
   ]
}));

interface PieCenterLabelProps {
   primaryText: string;
   secondaryText: string;
}

function PieCenterLabel({ primaryText, secondaryText }: PieCenterLabelProps) {
   const { width, height, left, top } = useDrawingArea();
   const primaryY = top + height / 2 - 10;
   const secondaryY = primaryY + 24;

   return (
      <React.Fragment>
         <StyledText
            variant = "primary"
            x = { left + width / 2 }
            y = { primaryY }
         >
            { primaryText }
         </StyledText>
         <StyledText
            variant = "secondary"
            x = { left + width / 2 }
            y = { secondaryY }
         >
            { secondaryText }
         </StyledText>
      </React.Fragment>
   );
}

interface BudgetProgressChartProps {
   title: string;
   categories: BudgetCategory[];
   totalGoal: number;
   totalCurrent: number;
}
function BudgetProgressChart({ title, categories, totalGoal, totalCurrent }: BudgetProgressChartProps) {
   // Calculate percentage of total budget used
   const percentUsed = Math.min(100, Math.round((totalCurrent / totalGoal) * 100)) || 0;

   // Prepare data for pie chart
   const chartData = categories.map(cat => ({
      label: cat.name,
      value: cat.goal
   }));

   return (
      <Stack
         direction = "column"
         spacing = { -3 }
         sx = { { flexGrow: 1, textAlign: "center" } }
      >
         <Typography
            variant = "h6"
         >
            { title }
         </Typography>
         <Box sx = { { display: "flex", alignItems: "center" } }>
            <PieChart
               height = { 300 }
               margin = {
                  {
                     left: 80,
                     right: 80,
                     top: 80,
                     bottom: 80
                  }
               }
               series = {
                  [
                     {
                        data: chartData,
                        innerRadius: 75,
                        outerRadius: 100,
                        paddingAngle: 0,
                        highlightScope: { faded: "global", highlighted: "item" }
                     }
                  ]
               }
               slotProps = {
                  {
                     legend: { hidden: true }
                  }
               }
               width = { 260 }
            >
               <PieCenterLabel
                  primaryText = { displayCurrency(totalCurrent) }
                  secondaryText = { `${percentUsed}% Used` }
               />
            </PieChart>
         </Box>
      </Stack>
   );
}

// Helper function to calculate total budget goals
const calculateTotal = (budget: OrganizedBudget) => {
   // Get the most recent month's data
   const mainGoal: number = budget.goals[budget.goalIndex].goal || 0;

   // Sum up all category goals for the most recent month/year
   const categoryTotal = budget.categories.reduce((acc, record) => {
      return acc + record.goals[record.goalIndex].goal;
   }, 0);

   return { mainGoal, categoryTotal };
};

export function BudgetPieChart({ type }: { type: "Income" | "Expenses" }) {
   const theme = useTheme();
   const budget: OrganizedBudget = useSelector((state: RootState) => state.budgets.value[type]);

   // Calculate totals (main goal and category total)
   const { mainGoal, categoryTotal } = calculateTotal(budget);

   // Prepare data for pie chart
   const pieData = budget.categories.map(category => ({
      id: category.budget_category_id,
      value: category.goals[category.goalIndex].goal,
      label: category.name || "",
      color: theme.palette.primary.main
   }));

   if (Math.abs(mainGoal - categoryTotal) > 0) {
      // Add an additional data point for the main goal, if there is a difference
      pieData.unshift({
         id: type,
         value: Math.abs(mainGoal - categoryTotal),
         label: type,
         color: theme.palette.primary.light
      });
   }

   // Prepare data for progress chart
   const progressCategories: BudgetCategory[] = budget.categories.map((category, index) => {
      const goal = category.goals[category.goalIndex].goal;
      return {
         name: category.name || "Unnamed",
         goal,
         current: 0,
         color: `hsl(220, 50%, ${65 - (index * 10)}%)`
      };
   });

   return (
      <Box>
         <Box sx = { { mt: 4 } }>
            <BudgetProgressChart
               categories = { progressCategories }
               title = { type }
               totalCurrent = { 0 }
               totalGoal = { mainGoal }
            />
         </Box>
      </Box>
   );
}