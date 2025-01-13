import { Stack, Typography } from "@mui/material";

import { SERVER_URL } from "@/root";

const quotes = [
   { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
   { text: "The stock market is filled with individuals who know the price of everything, but the value of nothing.", author: "Philip Fisher" },
   { text: "Do not save what is left after spending, but spend what is left after saving.", author: "Warren Buffett" },
   { text: "The four most dangerous words in investing are: ‘This time it’s different.’", author: "Sir John Templeton" },
   { text: "Time in the market beats timing the market.", author: "Ken Fisher" },
   { text: "It’s not whether you’re right or wrong that’s important, but how much money you make when you’re right and how much you lose when you’re wrong.", author: "George Soros" },
   { text: "The goal of a successful investor is to make money, not to be right.", author: "Bill Ackman" },
   { text: "Compound interest is the eighth wonder of the world. He who understands it earns it; he who doesn’t pays it.", author: "Albert Einstein" },
   { text: "Financial freedom is available to those who learn about it and work for it.", author: "Robert Kiyosaki" },
   { text: "Risk comes from not knowing what you’re doing.", author: "Warren Buffett" }
];

function Quote(quote: { text: string, author: string }) {
   const { text, author } = quote;

   return (
      <Stack direction = "column">
         <Typography
            sx = { { fontStyle: "italic", mb:1 } }
            variant = "h6"
         >
            "{ quote.text }"
         </Typography>
         <Typography
            sx = { { fontWeight: "bold" } }
            variant = "subtitle1"
         >
            - { quote.author }
         </Typography>
      </Stack>
   );
}

export default function Quotes() {

   return (
      <Stack direction = "column">
         <div className = "image">
            <img
               alt = "Stocks"
               src = { `${SERVER_URL}/resources/home/quotes.png` }
            />
         </div>
         <Stack
            direction = "column"
            gap = { 3 }
         >
            {
               quotes.map((quote, index) => {
                  return (
                     <Quote
                        author = { quote.author }
                        key = { index }
                        text = { quote.text }
                     />
                  );
               })
            }
         </Stack>
      </Stack>
   );
}