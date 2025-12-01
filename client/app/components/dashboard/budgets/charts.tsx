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
 * Props for the styled text component
 *
 * @property {"primary" | "secondary"} variant - Text variant type
 */
interface StyledTextProps {
   variant: "primary" | "secondary";
}

/**
 * Custom styled text for pie chart labels
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
 * Props for the pie chart center label
 *
 * @property {string} primaryText - Amount display text
 * @property {"Income" | "Expenses"} [type] - Budget type for test ID
 */
interface PieCenterLabelProps {
   primaryText: string;
   type?: "Income" | "Expenses";
}

/**
 * Central label for pie charts showing currency amount
 *
 * @param {PieCenterLabelProps} props - The props for the PieCenterLabel component
 * @returns {React.ReactNode} The PieCenterLabel component
 */
const PieCenterLabel = function PieCenterLabel({ primaryText, type }: PieCenterLabelProps): React.ReactNode {
   const { width, height, left, top } = useDrawingArea();
   const primaryY = top + height / 2;

   return (
      <StyledText
         data-testid = { type ? `budget-pie-center-${type}` : undefined }
         variant = "primary"
         x = { left + width / 2 }
         y = { primaryY }
      >
         { primaryText }
      </StyledText>
   );
};

/**
 * Props for the budget progress chart
 *
 * @property {string} title - Chart title
 * @property {"Income" | "Expenses"} type - Budget type
 * @property {{ label: string, percentage: number, value: number, color: string }[]} data - Chart data
 * @property {number} current - Current budget value
 */
interface BudgetProgressChartProps {
   title: string;
   type: "Income" | "Expenses";
   data: { label: string, percentage: number, value: number, color: string }[];
   current: number;
}

/**
 * Visualizes budget progress with pie chart and progress bars
 *
 * @param {BudgetProgressChartProps} props - The props for the BudgetProgressChart component
 * @returns {React.ReactNode} The BudgetProgressChart component
 */
function BudgetProgressChart({ title, data, type, current }: BudgetProgressChartProps): React.ReactNode {
   const theme = useTheme();

   return (
      <Stack
         data-testid = { `budget-chart-${type}` }
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
               <Box data-testid = { `budget-pie-chart-${type}` }>
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
                        type = { type }
                     />
                  </PieChart>
               </Box>
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
                           data-progress-percent = { category.percentage }
                           data-testid = { `budget-progress-${category.label}` }
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
 * Props for the budget pie chart
 *
 * @property {"Income" | "Expenses"} type - Budget type
 * @property {Record<string, Record<string, number>>} allocations - Period to budget allocation mapping
 */
interface BudgetPieChartProps {
   type: "Income" | "Expenses";
   allocations: Record<string, Record<string, number>>;
}

/**
 * Visualizes budget allocations with pie chart and linear progress bars
 *
 * @param {BudgetPieChartProps} props - The props for the BudgetPieChart component
 * @returns {React.ReactNode} The BudgetPieChart component
 */
export function BudgetPieChart({ type, allocations }: BudgetPieChartProps): React.ReactNode {
   const { month, year } = useSelector((state: RootState) => state.budgets.value.period);
   const budget: OrganizedBudget = useSelector((state: RootState) => state.budgets.value[type]);

   // Format period string (YYYY-MM)
   const period = useMemo(() => {
      return `${year}-${month.toString().padStart(2, "0")}`;
   }, [month, year]);

   // Calculate budget totals
   const total = Math.max(allocations[period]?.[type] || 0);
   const base = Math.max(total, 1);

   // Set pie chart color scheme based on budget type
   const hue = type === "Income" ? 120 : 0;
   const saturation = hue === 120 ? 44 : 90;

   // Generate pie chart data
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
         // Add main category slice if needed to ensure a complete pie chart
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
 * Props for the budget trends component
 *
 * @property {boolean} isCard - Whether displayed in card format
 */
interface BudgetTrendsProps {
   isCard: boolean;
}

/**
 * Displays budget trends over time
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
}