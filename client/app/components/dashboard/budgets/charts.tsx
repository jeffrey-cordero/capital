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
import { memo, useMemo } from "react";
import { useSelector } from "react-redux";

import { Trends } from "@/components/dashboard/trends";
import { calculateBudgetTotals } from "@/lib/charts";
import { displayCurrency, displayPercentage, horizontalScroll } from "@/lib/display";
import type { RootState } from "@/redux/store";

/**
 * Define the props for the StyledText component
 *
 * @interface StyledTextProps
 * @property {string} variant - The variant of the text
 */
interface StyledTextProps {
   variant: "primary" | "secondary";
}

/**
 * The StyledText component to display text in the pie chart
 *
 * @param {StyledTextProps} props - The props for the StyledText component
 * @returns {React.ReactNode} The StyledText component
 */
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

/**
 * Define the props for the PieCenterLabel component
 *
 * @interface PieCenterLabelProps
 * @property {string} primaryText - The primary text to display (amount)
 * @property {string} secondaryText - The secondary text to display (% used)
 */
interface PieCenterLabelProps {
   primaryText: string;
   secondaryText: string;
}

/**
 * The PieCenterLabel component to display text in the pie chart
 *
 * @param {PieCenterLabelProps} props - The props for the PieCenterLabel component
 * @returns {React.ReactNode} The PieCenterLabel component
 */
const PieCenterLabel = memo(function PieCenterLabel({ primaryText, secondaryText }: PieCenterLabelProps) {
   const { width, height, left, top } = useDrawingArea();
   const primaryY = top + height / 2 - 10;
   const secondaryY = primaryY + 24;

   return (
      <>
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
      </>
   );
});

/**
 * Define the props for the BudgetProgressChart component
 *
 * @interface BudgetProgressChartProps
 * @property {string} title - The title of the chart
 * @property {string} type - The type of the chart
 * @property {{ label: string, percentage: number, value: number, color: string }[]} data - The data for the chart
 * @property {number} total - The total value of the budget
 * @property {number} current - The current value used for the budget
 */
interface BudgetProgressChartProps {
   title: string;
   type: "Income" | "Expenses";
   data: { label: string, percentage: number, value: number, color: string }[];
   total: number;
   current: number;
}

/**
 * The BudgetProgressChart component to display the progress of the budget
 *
 * @param {BudgetProgressChartProps} props - The props for the BudgetProgressChart component
 * @returns {React.ReactNode} The BudgetProgressChart component
 */
function BudgetProgressChart({ title, data, type, current, total }: BudgetProgressChartProps): React.ReactNode {
   const theme = useTheme();
   const percent = Math.min(100, Math.round((current / total) * 100)) || 0;

   return (
      <Stack
         direction = "column"
         sx = { { flexGrow: 1, textAlign: "center" } }
      >
         <Typography
            variant = "h6"
         >
            { title }
         </Typography>
         <Stack
            direction = "column"
            sx = { { alignItems: "center", gap: 2, pb: 2 } }
         >
            <PieChart
               height = { 250 }
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
                        data: data,
                        innerRadius: 75,
                        outerRadius: 100,
                        paddingAngle: 0,
                        highlightScope: { faded: "global", highlighted: "item" }
                     }
                  ]
               }
               slotProps = {
                  {
                     legend: {
                        hidden: true
                     }
                  }
               }
            >
               <PieCenterLabel
                  primaryText = { displayCurrency(current) }
                  secondaryText = { `${percent}% Used` }
               />
            </PieChart>
            {
               data.map((category, index) => (
                  <Stack
                     direction = "row"
                     key = { index }
                     sx = { { width: "100%", alignItems: "center", gap: 2, pb: 2, px: { xs: 0, sm: 2, md: 5 } } }
                  >
                     <Stack sx = { { gap: 1, flexGrow: 1, maxWidth: "100%" } }>
                        <Stack
                           direction = "column"
                           spacing = { 0.5 }
                           sx = { { width: "100%", mx: "auto", justifyContent: "space-between", alignItems: "center" } }
                        >
                           <Typography
                              sx = { { ...horizontalScroll(theme), maxWidth: "calc(100% - 1rem)", fontWeight: "600" } }
                              variant = "subtitle1"
                           >
                              { category.label }
                           </Typography>
                           <Typography
                              sx = { { ...horizontalScroll(theme), maxWidth: "90%", color: "text.secondary" } }
                              variant = "subtitle1"
                           >
                              { displayPercentage(category.percentage) }
                           </Typography>
                        </Stack>
                        <LinearProgress
                           aria-label = { `${category.label} progress` }
                           color = { type === "Income" ? "success" : "error" }
                           sx = { { height: "1.25rem", borderRadius: "16px", boxShadow: 0 } }
                           value = { category.percentage }
                           variant = "determinate"
                        />
                     </Stack>
                  </Stack>
               ))
            }
         </Stack>
      </Stack>
   );
}

/**
 * The BudgetPieChart component to display the pie chart of the budget
 *
 * @param {string} type - The type of the budget
 * @returns {React.ReactNode} The BudgetPieChart component
 */
export function BudgetPieChart({ type }: { type: "Income" | "Expenses" }) {
   const budget: OrganizedBudget = useSelector((state: RootState) => state.budgets.value[type]);

   // Calculate category totals
   const { mainGoal, categoryGoals } = calculateBudgetTotals(budget);
   const total = Math.max(mainGoal, categoryGoals);
   const base = Math.max(total, 1); // Ensure non-zero denominator for total budget sum

   // Calculate hue and saturation for pie chart categories
   const hue = type === "Income" ? 120 : 0;
   const saturation = hue === 120 ? 44 : 90;

   // Memoize the pie chart data
   const pieData = useMemo(() => {
      const data = budget.categories.map((category, index) => {
         const value = Number(category.goals[category.goalIndex]?.goal || 0);

         return {
            label: category.name || "Unnamed Category",
            percentage: 100 * (value / base),
            value: value,
            color: `hsl(${hue}, ${saturation}%, ${60 - ((index + 1) * 5)}%)`
         };
      });

      // Additional data point for the main goal if the sum of the category totals is less than the main goal
      if (mainGoal > categoryGoals) {
         data.unshift({
            label: type,
            percentage: 100 * (Math.abs(mainGoal - categoryGoals) / base),
            value: Math.abs(mainGoal - categoryGoals),
            color: `hsl(${hue}, ${saturation}%, ${60 - (budget.categories.length * 5)}%)`
         });
      }

      return data;
   }, [budget, mainGoal, categoryGoals, base, hue, saturation, type]);

   return (
      <Box>
         <Box sx = { { mt: 4 } }>
            <BudgetProgressChart
               current = { 0 }
               data = { pieData }
               title = { type }
               total = { base }
               type = { type }
            />
         </Box>
      </Box>
   );
}

/**
 * The BudgetTrends component to display the trends of the budget
 *
 * @param {boolean} isCard - Whether the trends are in a card
 * @returns {React.ReactNode} The BudgetTrends component
 */
export function BudgetTrends({ isCard }: { isCard: boolean }): React.ReactNode {
   const theme = useTheme();

   const yearsData = useMemo(() => [
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
   ], [theme.palette.success.main, theme.palette.error.main]);

   return (
      <Box sx = { { position: "relative" } }>
         <Trends
            data = { yearsData }
            extraInfo = {
               <Chip
                  color = "success"
                  label = { "+52%" }
                  size = "small"
               />
            }
            isCard = { isCard }
            title = "Budget"
            value = "$0.00"
         />
      </Box>
   );
};