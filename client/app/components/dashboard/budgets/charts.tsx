import {
   Box,
   Chip,
   LinearProgress,
   Stack,
   styled,
   Typography,
   useTheme
} from "@mui/material";
import { PieChart, useDrawingArea } from "@mui/x-charts";
import { type OrganizedBudget } from "capital/budgets";
import * as React from "react";
import { useSelector } from "react-redux";

import { Trends } from "@/components/dashboard/trends";
import { displayCurrency, displayPercentage, ellipsis } from "@/lib/display";
import type { RootState } from "@/redux/store";

export function calculateBudgetTotals(budget: OrganizedBudget): { mainGoal: number, categoryTotal: number } {
   // Get the most recent month's data
   const mainGoal: number = Number(budget.goals[budget.goalIndex].goal) || 0;

   // Sum up all category goals for the most recent month/year
   const categoryTotal = budget.categories.reduce((acc, record) => {
      return acc + Number(record.goals[record.goalIndex].goal);
   }, 0);

   return { mainGoal, categoryTotal };
};

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
            variant="primary"
            x={left + width / 2}
            y={primaryY}
         >
            {primaryText}
         </StyledText>
         <StyledText
            variant="secondary"
            x={left + width / 2}
            y={secondaryY}
         >
            {secondaryText}
         </StyledText>
      </React.Fragment>
   );
}

interface BudgetProgressChartProps {
   title: string;
   type: "Income" | "Expenses";
   data: { label: string, percentage: number, value: number, color: string }[];
   totalGoal: number;
   totalCurrent: number;
}

function BudgetProgressChart({ title, data, type, totalGoal, totalCurrent }: BudgetProgressChartProps) {
   // Calculate percentage of total budget used
   const percentUsed = Math.min(100, Math.round((totalCurrent / totalGoal) * 100)) || 0;

   return (
      <Stack
         direction="column"
         sx={{ flexGrow: 1, textAlign: "center" }}
      >
         <Typography
            variant="h6"
         >
            {title}
         </Typography>
         <Stack
            direction="column"
            sx={{ alignItems: "center", gap: 2, pb: 2 }}
         >
            <PieChart
               height={250}
               margin={
                  {
                     left: 80,
                     right: 80,
                     top: 80,
                     bottom: 80
                  }
               }
               series={
                  [
                     {
                        data: data,
                        innerRadius: 75,
                        outerRadius: 100,
                        paddingAngle: 0,
                        highlightScope: { faded: "global", highlighted: "item" }
                     }
                  ]
               }
               slotProps={
                  {
                     legend: {
                        hidden: true
                     }
                  }
               }
            >
               <PieCenterLabel
                  primaryText={displayCurrency(totalCurrent)}
                  secondaryText={`${percentUsed}% Used`}
               />
            </PieChart>
            {
               data.map((category, index) => (
                  <Stack
                     direction="row"
                     key={index}
                     sx={{ width: "100%", alignItems: "center", gap: 2, pb: 2, px: { xs: 2, sm: 5 } }}
                  >
                     <Stack sx={{ gap: 1, flexGrow: 1 }}>
                        <Stack
                           direction="column"
                           spacing={0.5}
                           sx={{ justifyContent: "space-between", alignItems: "center" }}
                        >
                           <Typography
                              sx={{ ...ellipsis, maxWidth: { xs: "200px", sm: "500px" }, fontWeight: "600" }}
                              variant="body2"
                           >
                              {category.label}
                           </Typography>
                           <Typography
                              sx={{ ...ellipsis, color: "text.secondary" }}
                              variant="body2"
                           >
                              {displayPercentage(category.percentage)}
                           </Typography>
                        </Stack>
                        <LinearProgress
                           aria-label={`${category.label} progress`}
                           color={type === "Income" ? "success" : "error"}
                           value={0}
                           variant="determinate"
                        />
                     </Stack>
                  </Stack>
               ))
            }
         </Stack>
      </Stack>
   );
}

export function BudgetPieChart({ type }: { type: "Income" | "Expenses" }) {
   const budget: OrganizedBudget = useSelector((state: RootState) => state.budgets.value[type]);

   // Calculate totals (main goal and category total)
   const { mainGoal, categoryTotal } = calculateBudgetTotals(budget);

   const hue = type === "Income" ? 120 : 0;
   const saturation = type === "Income" ? 44 : 90;

   // Prepare data for pie chart
   const base = mainGoal > categoryTotal ? mainGoal : categoryTotal;
   const pieData = budget.categories.map((category, index) => ({
      label: category.name || "",
      percentage: 100 * (Number(category.goals[category.goalIndex].goal) / base),
      value: Number(category.goals[category.goalIndex].goal),
      color: `hsl(${hue}, ${saturation}%, ${60 - ((index + 1) * 5)}%)`
   }));

   if (mainGoal > categoryTotal) {
      // Add an additional data point for the main goal, if there is a difference
      pieData.unshift({
         label: type,
         percentage: 100 * (Math.abs(mainGoal - categoryTotal) / (base)),
         value: Math.abs(mainGoal - categoryTotal),
         color: `hsl(${hue}, ${saturation}%, ${60 - (budget.categories.length * 5)}%)`
      });
   }

   return (
      <Box>
         <Box sx={{ mt: 4 }}>
            <BudgetProgressChart
               data={pieData}
               title={type}
               totalCurrent={0}
               totalGoal={mainGoal}
               type={type}
            />
         </Box>
      </Box>
   );
}

export function BudgetTrends({ isCard }: { isCard: boolean }) {
   const theme = useTheme();
   return (
      <Box sx={{ position: "relative" }}>
         <Trends
            extraInfo={
               <Chip
                  color="success"
                  label="+52%"
                  size="small"
               />
            }
            isCard={isCard}
            subtitle="Income vs. Expenses"
            title="Budget"
            value="$0.00"
            years={
               [
                  {
                     id: "income",
                     label: "Income",
                     data: [45234, 33872, 29198, 49125, 41317, 27389, 29398, 45234, 33872, 29198, 49125, 41317],
                     stack: "A",
                     color: theme.palette.success.main
                  },
                  {
                     id: "expenses",
                     label: "Expenses",
                     data: [45234, 33872, 29198, 42125, 51317, 27389, 29398, 45234, 33872, 22198, 12125, 2317],
                     stack: "B",
                     color: theme.palette.error.main
                  }
               ]
            }
         />
      </Box>
   );
}