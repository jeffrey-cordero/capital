import {
   Box,
   Stack,
   styled,
   Typography,
   useTheme
} from "@mui/material";
import LinearProgress, { linearProgressClasses } from "@mui/material/LinearProgress";
import { PieChart, useDrawingArea } from "@mui/x-charts";
import { type OrganizedBudgets } from "capital/budgets";
import * as React from "react";

import { displayCurrency, displayVolume } from "@/lib/display";

const data = [
   { label: "India", value: 50000 },
   { label: "USA", value: 35000 },
   { label: "Brazil", value: 10000 },
   { label: "Other", value: 5000 }
];

const countries = [
   {
      name: "India",
      value: 50,
      color: "hsl(220, 25%, 65%)"
   },
   {
      name: "USA",
      value: 35,
      color: "hsl(220, 25%, 45%)"
   },
   {
      name: "Brazil",
      value: 10,
      color: "hsl(220, 25%, 30%)"
   },
   {
      name: "Other",
      value: 5,
      color: "hsl(220, 25%, 20%)"
   }
];

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

function ChartUserByCountry() {
   return (
      <Stack
         direction = "column"
         spacing = { 2 }
         sx = { { flexGrow: 1 } }
      >
         <Typography
            component = "h2"
            variant = "subtitle2"
         >
            Income
         </Typography>
         <Box sx = { { display: "flex", alignItems: "center" } }>
            <PieChart
               height = { 260 }
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
                        data,
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
                  primaryText = { displayVolume(11111111) }
                  secondaryText = "Total"
               />
            </PieChart>
         </Box>
         {
            countries.map((country, index) => (
               <Stack
                  direction = "row"
                  key = { index }
                  sx = { { alignItems: "center", gap: 2, pb: 2 } }
               >
                  <Stack sx = { { gap: 1, flexGrow: 1 } }>
                     <Stack
                        direction = "row"
                        sx = {
                           {
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 2
                           }
                        }
                     >
                        <Typography
                           sx = { { fontWeight: "500" } }
                           variant = "body2"
                        >
                           { country.name }
                        </Typography>
                        <Typography
                           sx = { { color: "text.secondary" } }
                           variant = "body2"
                        >
                           { country.value }%
                        </Typography>
                     </Stack>
                     <LinearProgress
                        aria-label = "Number of users by country"
                        sx = {
                           {
                              [`& .${linearProgressClasses.bar}`]: {
                                 backgroundColor: country.color
                              }
                           }
                        }
                        value = { country.value }
                        variant = "determinate"
                     />
                  </Stack>
               </Stack>
            ))
         }
      </Stack>
   );
}

// Helper function to calculate total budget goals
const calculateTotal = (budgets: OrganizedBudgets, type: "Income" | "Expenses") => {
   // Get the most recent month's data
   const mainGoal: number = budgets[type].goals[0]?.goal || 0;

   // Sum up all category goals for the most recent month/year
   const categoryTotal = budgets[type].categories.reduce((acc, record) => {
      return acc + record.goals[0]?.goal || 0;
   }, 0);

   return { mainGoal, categoryTotal };
};

export function IncomePieChart({ budgets }: { budgets: OrganizedBudgets }) {
   const theme = useTheme();

   // Calculate totals (main goal and category total)
   const { mainGoal, categoryTotal } = calculateTotal(budgets, "Income");

   // Prepare data for pie chart
   const data = budgets.Income.categories.map(category => ({
      id: category.budget_category_id,
      value: category.goals[0]?.goal || 0,
      label: category.name || "",
      color: theme.palette.primary.main
   }));

   if (Math.abs(mainGoal - categoryTotal) > 0) {
      // Add an additional data point for the main goal, if there is a difference
      data.unshift({
         id: "Income",
         value: Math.abs(mainGoal - categoryTotal),
         label: "Income",
         color: theme.palette.primary.light
      });
   }

   return (
      <Box>
         <Typography
            component = "h2"
            gutterBottom = { true }
            variant = "subtitle2"
         >
            Income Budget
         </Typography>
         <Typography
            component = "p"
            variant = "h4"
         >
            { displayCurrency(mainGoal) }
         </Typography>
         <Typography
            color = "text.secondary"
            component = "p"
            variant = "subtitle2"
         >
            Monthly Income Budget
         </Typography>

         <Box sx = { { height: 300, mt: 2 } }>
            {
               data.length > 0 ? (
                  <PieChart
                     height = { 300 }
                     margin = { { top: 10, bottom: 10, left: 10, right: 10 } }
                     series = {
                        [
                           {
                              data,
                              innerRadius: 30,
                              paddingAngle: 2,
                              cornerRadius: 4,
                              highlightScope: { faded: "global", highlighted: "item" },
                              arcLabel: (item) => `${item.label}: ${displayCurrency(item.value)}`,
                              arcLabelMinAngle: 20
                           }
                        ]
                     }
                     slotProps = {
                        {
                           legend: { hidden: true }
                        }
                     }
                  />
               ) : (
                  <Stack
                     alignItems = "center"
                     justifyContent = "center"
                     sx = { { height: "100%" } }
                  >
                     <Typography color = "text.secondary">
                        No income categories defined
                     </Typography>
                  </Stack>
               )
            }
         </Box>
      </Box>
   );
}

export function ExpensesPieChart({ budgets }: { budgets: OrganizedBudgets }) {
   const theme = useTheme();

   // Calculate totals
   const { mainGoal, categoryTotal } = calculateTotal(budgets, "Expenses");

   // Prepare data for pie chart
   const data = budgets.Expenses.categories.map(category => ({
      id: category.budget_category_id,
      value: category.goals[0]?.goal || 0,
      label: category.name || "",
      color: theme.palette.error.main
   }));

   if (Math.abs(mainGoal - categoryTotal) > 0) {
      // Add an additional data point for the main goal, if there is a difference
      data.unshift({
         id: "Expenses",
         value: Math.abs(mainGoal - categoryTotal),
         label: "Expenses",
         color: theme.palette.error.light
      });
   }

   return (
      <Box>
         <Typography
            component = "h2"
            gutterBottom = { true }
            variant = "subtitle2"
         >
            Expenses Budget
         </Typography>
         <Typography
            component = "p"
            variant = "h4"
         >
            { displayCurrency(mainGoal) }
         </Typography>
         <Typography
            color = "text.secondary"
            component = "p"
            variant = "subtitle2"
         >
            Monthly Expenses Budget
         </Typography>

         <Box sx = { { height: 300, mt: 2 } }>
            {
               data.length > 0 ? (
                  <PieChart
                     height = { 300 }
                     margin = { { top: 10, bottom: 10, left: 10, right: 10 } }
                     series = {
                        [
                           {
                              data,
                              innerRadius: 30,
                              paddingAngle: 2,
                              cornerRadius: 4,
                              highlightScope: { faded: "global", highlighted: "item" },
                              arcLabel: (item) => `${item.label}: ${displayCurrency(item.value)}`,
                              arcLabelMinAngle: 20
                           }
                        ]
                     }
                     slotProps = {
                        {
                           legend: { hidden: true }
                        }
                     }
                  />
               ) : (
                  <Stack
                     alignItems = "center"
                     justifyContent = "center"
                     sx = { { height: "100%" } }
                  >
                     <Typography color = "text.secondary">
                        No expense categories defined
                     </Typography>
                  </Stack>
               )
            }
            <ChartUserByCountry />
         </Box>
      </Box>
   );
}