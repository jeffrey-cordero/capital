import { faExternalLink, faSearch, faSearchLocation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link } from "@mui/material";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid2";
import Stack from "@mui/material/Stack";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { areaElementClasses } from "@mui/x-charts/LineChart";
import { SparkLineChart } from "@mui/x-charts/SparkLineChart";
import type { StockTrends } from "capital-types/marketTrends";
import { timeSinceLastUpdate } from "@/components/home/news";

export function AreaGradient({ color, id }: { color: string; id: string }) {
   return (
      <defs>
         <linearGradient id={id} x1="50%" x2="50%" y1="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
         </linearGradient>
      </defs>
   );
}

export function Stocks(props: StockTrends) {
   const { top_gainers, top_losers, most_actively_traded, last_updated } = props;
   const theme = useTheme();

   const trendColors = {
      up:
         theme.palette.mode === "light"
            ? theme.palette.success.main
            : theme.palette.success.dark,
      down:
         theme.palette.mode === "light"
            ? theme.palette.error.main
            : theme.palette.error.dark,
      neutral:
         theme.palette.mode === "light"
            ? theme.palette.info.main
            : theme.palette.info.dark,
   };

   const labelColors = {
      up: "success" as const,
      down: "error" as const,
      neutral: "default" as const,
   };

   // Helper function to render a single stock trend
   const renderTrend = (
      title: string,
      data: {
         ticker: string;
         price: string;
         change_amount: string;
         change_percentage: string;
         volume: string;
      }[],
      trend: "up" | "down" | "neutral",
      image: string
   ) => {
      const color = labelColors[trend];

      return (
         <Card
            elevation={3}
            sx={{flexGrow: 1, textAlign: "left", borderRadius: 2, mb: 2, px: 2 }}
            variant="elevation"
         >
            <CardContent>
            <Box className="animation-container" sx = {{ flexDirection: "column" }}>
               <Typography component="h2" variant="h3" fontWeight="bold">
                  {title}
               </Typography>
               <Box
                  alt = "News"
                  component = "img"
                  src = { image }
                  sx = { { width: 200, height: "auto", mx: "auto", my:0 } }
               />
            </Box>
               {data.map((stock, index) => (
                  <Stack key={index} direction="column" sx={{ gap: 1, mb: 2 }}>
                     <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
                        <Typography component="p" variant="h6" sx={{ fontWeight: "bold" }}>
                           <Link href = {`https://www.google.com/search?q=${stock.ticker}+stock`} target = "_blank" underline="none">
                              {stock.ticker}
                           </Link>
                        </Typography>
                        <Chip
                           color={color}
                           label={stock.change_percentage}
                           size="small"
                        />
                        </Stack>
                     <Typography variant="body2">Price: ${stock.price}</Typography>
                     <Typography variant="body2">Change: ${stock.change_amount}</Typography>
                     <Typography variant="body2">Volume: {stock.volume}</Typography>
                  </Stack>
               ))}
            </CardContent>
         </Card>
      );
   };

   return (
      <Stack direction="column" sx={{ gap: 2, py: 4 }}>
          <Box className = "animation-container">
            <Box
               alt = "Stocks"
               className = "floating"
               component = "img"
               src = "stocks.svg"
               sx = { { width: 400, height: "auto", mx: "auto" } }
            />
         </Box>
         <Typography variant="subtitle2" fontStyle="italic">
            Updated {timeSinceLastUpdate(last_updated.split(" ")[0] + ":" + last_updated.split(" ")[1])}
         </Typography>
         <Grid sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {renderTrend("Top Gainers", top_gainers, "up", "rocket.svg")}
            {renderTrend("Top Losers", top_losers, "down", "loss.svg")}
            {renderTrend("Most Actively Traded", most_actively_traded, "neutral", "active.svg")}
         </Grid>
      </Stack>
   );
}