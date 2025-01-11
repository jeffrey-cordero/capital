import { useQuery } from "@tanstack/react-query";
import { CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Title, Tooltip } from "chart.js";
import { Container, Image } from "react-bootstrap";
import { Line } from "react-chartjs-2";

import { SERVER_URL } from "@/client/app/root";
import { type StockData, type Stocks } from "@/types/stocks";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const legend: Record<string, string> = {
   "VT":"Vanguard Total World Stock Index Fund ETF",
   "VTI":"Vanguard Total Stock Market Index Fund ETF",
   "SPY":"SPDR S&P 500 ETF Trust",
   "QQQ":"Invesco QQQ Trust Series 1",
   "BITW":"Bitwise 10 Crypto Index Units Beneficial Interest"
};

export async function fetchStocks(): Promise<Record<string, any>> {
   try {
      const response = await fetch(`${SERVER_URL}/home/stocks`, {
         method: "GET",
         headers: {
            "Content-Type": "application/json"
         },
         credentials: "include"
      });

      const result = await response.json();

      return JSON.parse(result.data.stocks.data);
   } catch (error) {
      console.error(error);

      return {};
   }
}

interface StockProps {
   stock: string;
   information: Record<string, StockData>;
}

function Stock(props: StockProps) {
   const { stock, information } = props;

   const dates: string[] = [];
   const prices: number[] = [];
   const times = Object.keys(information).sort();

   for (let i = times.length - 30; i < times.length; i++) {
      dates.push(times[i].split(" ")[0]);
      prices.push(parseFloat(information[stock][times[i]]["1. open"]));
   }

   const stockColor = prices[times.length - 1] < prices[times.length - 31] ? "red" : "#07EA3A";

   const data = {
      labels: dates,
      datasets: [{
         label: `${stock}: Monthly Prices`,
         borderColor: stockColor,
         backgroundColor: stockColor,
         data: prices,
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
      responsive: true,
      plugins: {
         title: {
            display: true,
            text: `${legend[stock]}: Monthly Prices`
         }
      }
   };

   return (
      <Line
         data = { data }
         options = { options }
      />
   );
}

export default function MonthlyStocks() {
   const { data, isLoading } = useQuery({
      queryKey: ["stocks"],
      queryFn: fetchStocks,
      staleTime: 60 * 60 * 1000,
      gcTime: 60 * 60 * 1000
   });

   const stocks = data as Stocks;

   return (
      !isLoading && Object.keys(data as object).length > 0 ? (
         <Container>
            <div className = "image">
               <Image
                  alt = "Stories"
                  src = { `${SERVER_URL}/resources/home/stocks.png` }
               />
            </div>
            <div className = "d-flex flex-column justify-content-center align-items-center gap-3">
               {
                  Object.keys(stocks).map((stock) => {
                     return (
                        <Stock
                           information = { stocks[stock] }
                           key = { stock }
                           stock = { stock }
                        />
                     );
                  })
               }
            </div>
         </Container>
      ) : (
         null
      )
   );
}