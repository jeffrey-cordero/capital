import { Box, Stack } from "@mui/material";
// import { LineChart, ResponsiveChartContainer } from "@mui/x-charts";
import { type Prices, type Stocks } from "capital-types/stocks";

const legend: Record<string, string> = {
   "VT":"Vanguard Total World Stock Index Fund ETF",
   "VTI":"Vanguard Total Stock Market Index Fund ETF",
   "SPY":"SPDR S&P 500 ETF Trust",
   "QQQ":"Invesco QQQ Trust Series 1",
   "BITW":"Bitwise 10 Crypto Index Units Beneficial Interest"
};

interface StockProps {
   stock: string;
   prices: Prices;
}

function Stock(props: StockProps) {
   const { stock, prices } = props;

   const dates: string[] = [];
   const values: number[] = [];
   const times = Object.keys(prices).sort();

   for (let i = times.length - 30; i < times.length; i++) {
      dates.push(times[i].split(" ")[0]);
      values.push(parseFloat(prices[times[i]]["1. open"]));
   }

   const stockColor = prices[times.length - 1] < prices[times.length - 31] ? "red" : "#07EA3A";

   const data = {
      labels: dates,
      datasets: [{
         label: `${stock}: Monthly Prices`,
         borderColor: stockColor,
         backgroundColor: stockColor,
         data: values,
         pointRadius: 5,
         pointBackgroundColor: stockColor,
         pointBorderColor: stockColor,
         pointHoverRadius: 8,
         pointHoverBackgroundColor: stockColor,
         pointHoverBorderColor: stockColor,
         pointHitRadius: 10,
         pointBorderWidth: 2,
         tension: 0.2
      }]
   };

   const options = {
      plugins: {
         responsive: true,
         maintainAspectRatio: true,
         title: {
            display: true,
            text: `${legend[stock]}`
         }
      }
   };

   return (
      // <Line
      //    data = { data }
      //    options = { options }
      //    style = { { maxWidth: "100%" } }
      // />
      // <ResponsiveChartContainer>
      //    <LineChart
      //       data = { data }
      //       options = { options }
      //    />
      // </ResponsiveChartContainer>
      <div></div>
   );
}

interface MonthlyStocksProps {
   stocks: Stocks;
}

export default function MonthlyStocks(props: MonthlyStocksProps) {
   const { stocks } = props;

   return (
      Object.keys(stocks).length > 0 ? (
         <Stack direction = "column">
            <Box
               alt = "Stocks"
               component = "img"
               src = "stocks.svg"
               sx = { { width: 350, height: "auto", mb: 4 } }
            />
            <Stack
               direction = "column"
               gap = { 3 }
            >
               {
                  Object.keys(stocks).map((stock) => {
                     return (
                        <Stock
                           key = { stock }
                           prices = { stocks[stock] }
                           stock = { stock }
                        />
                     );
                  })
               }
            </Stack>
         </Stack>
      ) : (
         null
      )
   );
}