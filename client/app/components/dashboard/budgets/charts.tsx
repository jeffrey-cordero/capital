import {
   Box,
   LinearProgress,
   Stack,
   styled,
   Typography,
   useTheme
} from "@mui/material";
import { PieChart, useDrawingArea } from "@mui/x-charts";
import { type OrganizedBudget } from "capital/budgets";
import { useMemo } from "react";
import { useSelector } from "react-redux";

import { Trends } from "@/components/dashboard/trends";
import ChartContainer from "@/components/global/chart-container";
import { displayPercentage, displayVolume, horizontalScroll } from "@/lib/display";
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
            fontSize: theme.typography.h4.fontSize
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
 */
interface PieCenterLabelProps {
   primaryText: string;
}

/**
 * The PieCenterLabel component to display text in the pie chart
 *
 * @param {PieCenterLabelProps} props - The props for the PieCenterLabel component
 * @returns {React.ReactNode} The PieCenterLabel component
 */
const PieCenterLabel = function PieCenterLabel({ primaryText }: PieCenterLabelProps): React.ReactNode {
   const { width, height, left, top } = useDrawingArea();
   const primaryY = top + height / 2;

   return (
      <StyledText
         variant = "primary"
         x = { left + width / 2 }
         y = { primaryY }
      >
         { primaryText }
      </StyledText>
   );
};

/**
 * Define the props for the BudgetProgressChart component
 *
 * @interface BudgetProgressChartProps
 * @property {string} title - The title of the chart
 * @property {string} type - The type of the chart
 * @property {{ label: string, percentage: number, value: number, color: string }[]} data - The data for the chart
 * @property {number} current - The current value used for the budget
 */
interface BudgetProgressChartProps {
   title: string;
   type: "Income" | "Expenses";
   data: { label: string, percentage: number, value: number, color: string }[];
   current: number;
}

/**
 * The BudgetProgressChart component to display the progress of the budget
 *
 * @param {BudgetProgressChartProps} props - The props for the BudgetProgressChart component
 * @returns {React.ReactNode} The BudgetProgressChart component
 */
function BudgetProgressChart({ title, data, type, current }: BudgetProgressChartProps): React.ReactNode {
   const theme = useTheme();

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
         <ChartContainer height = { 265 }>
            <Stack
               direction = "column"
               sx = { { justifyContent: "center", alignItems: "center", gap: 2, pb: 2 } }
            >
               <PieChart
                  height = { 265 }
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
                           innerRadius: 85,
                           outerRadius: 105,
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
                  width = { 265 }
               >
                  <PieCenterLabel
                     primaryText = { `$${displayVolume(current)}` }
                  />
               </PieChart>
            </Stack>
         </ChartContainer>
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
                     <Box sx = { { px: 0.5 } }>
                        <LinearProgress
                           aria-label = { `${category.label} progress` }
                           color = { type === "Income" ? "success" : "error" }
                           sx = { { height: "1.50rem", borderRadius: "16px", boxShadow: 0 } }
                           value = { category.percentage }
                           variant = "determinate"
                        />
                     </Box>
                  </Stack>
               </Stack>
            ))
         }
      </Stack>
   );
}

/**
 * Define the props for the BudgetPieChart component
 *
 * @interface BudgetPieChartProps
 * @property {string} type - The type of the budget
 * @property {Record<string, Record<string, number>>} allocations - Mapping of periods to budget allocations
 */
interface BudgetPieChartProps {
   type: "Income" | "Expenses";
   allocations: Record<string, Record<string, number>>;
}

/**
 * The BudgetPieChart component to display the pie chart of the budget
 *
 * @param {string} type - The type of the budget
 * @returns {React.ReactNode} The BudgetPieChart component
 */
export function BudgetPieChart({ type, allocations }: BudgetPieChartProps): React.ReactNode {
   const { month, year } = useSelector((state: RootState) => state.budgets.value.period);
   const budget: OrganizedBudget = useSelector((state: RootState) => state.budgets.value[type]);

   // Period string representing the current month and year
   const period = useMemo(() => {
      return `${year}-${month.toString().padStart(2, "0")}`;
   }, [month, year]);

   // Total budget allocation for the current period
   const total = Math.max(allocations[period]?.[type] || 0);
   const base = Math.max(total, 1);

   // Hue and saturation values for the pie chart categories based on budget type
   const hue = type === "Income" ? 120 : 0;
   const saturation = hue === 120 ? 44 : 90;

   // Pie data for the budget categories
   const pieData = useMemo(() => {
      let sum = 0;
      const data = budget.categories.map((category, index) => {
         const value = allocations[period]?.[category.budget_category_id] || 0;
         sum += value;

         return {
            label: category.name || "Unnamed Category",
            percentage: 100 * (value / base),
            value: value,
            color: `hsl(${hue}, ${saturation}%, ${60 - ((index + 1) * 5)}%)`
         };
      });

      if (sum === 0 || sum < total) {
         // Main type data point if the sum of the category allocations is less than the total budget allocation
         data.unshift({
            label: type,
            percentage: 100 * (Math.abs(sum - total) / base),
            value: Math.max(Math.abs(sum - total), 0.000000000001),
            color: `hsl(${hue}, ${saturation}%, ${60 - (budget.categories.length * 5)}%)`
         });
      }

      return data;
   }, [budget, base, hue, saturation, type, allocations, period, total]);

   return (
      <Box>
         <Box sx = { { mt: 4 } }>
            <BudgetProgressChart
               current = { allocations[period]?.[type] || 0 }
               data = { pieData }
               title = { type }
               type = { type }
            />
         </Box>
      </Box>
   );
}

/**
 * Define the props for the BudgetTrends component
 *
 * @interface BudgetTrendsProps
 * @property {boolean} isCard - Whether the trends are in a card
 */
interface BudgetTrendsProps {
   isCard: boolean;
}

/**
 * The BudgetTrends component to display the trends of the budget
 *
 * @param {BudgetTrendsProps} props - The props for the BudgetTrends component
 * @returns {React.ReactNode} The BudgetTrends component
 */
export function BudgetTrends({ isCard }: BudgetTrendsProps): React.ReactNode {
   return (
      <Box sx = { { position: "relative" } }>
         <Trends
            isCard = { isCard }
            type = "budgets"
         />
      </Box>
   );
};