import { Card, CardContent, Stack, Typography } from "@mui/material";

import { ellipsis } from "@/lib/display";

interface TrendCardProps {
   title: string;
   value: string;
   subtitle: string;
   elevation: number;
   chart: React.ReactNode;
   extraInfo?: React.ReactNode;
}

// Common card layout component for Account and Budget trends
export function TrendCard({ title, value, subtitle, chart, extraInfo, elevation }: TrendCardProps) {
   return (
      <Card
         elevation = { elevation }
         sx = { { borderRadius: 2 } }
         variant = "elevation"
      >
         <CardContent sx = { { p: elevation === 0 ? 0 : 2.5, textAlign: elevation === 0 ? "center" : "left" } }>
            <Typography
               component = "h2"
               gutterBottom = { true }
               variant = "subtitle2"
            >
               { title }
            </Typography>
            <Stack sx = { { justifyContent: "space-between" } }>
               <Stack
                  direction = { elevation === 0 ? "column" : "row" }
                  sx = {
                     {
                        justifyContent: elevation === 0 ? "center" : "flex-start",
                        alignContent: "center",
                        alignItems: "center",
                        gap: 1
                     }
                  }
               >
                  <Typography
                     component = "p"
                     sx = { { ...ellipsis, maxWidth: "95%" } }
                     variant = "h4"
                  >
                     { value }
                  </Typography>
                  { extraInfo }
               </Stack>
               <Typography
                  sx = { { color: "text.secondary" } }
                  variant = "caption"
               >
                  { subtitle }
               </Typography>
            </Stack>
            { chart }
         </CardContent>
      </Card>
   );
}