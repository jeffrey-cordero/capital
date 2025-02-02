import { faLightbulb } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Card, CardContent, Grid2, Typography } from "@mui/material";

const quotes = [
   { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
   { text: "The stock market is filled with individuals who know the price of everything, but the value of nothing.", author: "Philip Fisher" },
   { text: "Do not save what is left after spending, but spend what is left after saving.", author: "Warren Buffett" },
   { text: "The four most dangerous words in investing are: 'This time it's different.'", author: "Sir John Templeton" },
   { text: "Time in the market beats timing the market.", author: "Ken Fisher" },
   { text: "It's not whether you're right or wrong that's important, but how much money you make when you're right and how much you lose when you're wrong.", author: "George Soros" },
   { text: "The goal of a successful investor is to make money, not to be right.", author: "Bill Ackman" },
   { text: "Compound interest is the eighth wonder of the world. He who understands it earns it; he who doesn't pays it.", author: "Albert Einstein" },
   { text: "Financial freedom is available to those who learn about it and work for it.", author: "Robert Kiyosaki" },
   { text: "Risk comes from not knowing what you're doing.", author: "Warren Buffett" },
   { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" }
];

function QuoteCard({ quote }: { quote: { text: string, author: string } }) {
   const { text, author } = quote;

   return (
      <Card
         sx = {
            {
               height: "100%",
               display: "flex",
               flexDirection: "column",
               justifyContent: "center",
               textAlign: "center",
               padding: 3,
               boxShadow: 3,
               transition: "transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out",
               "&:hover": {
                  transform: "scale(1.03)",
                  boxShadow: 6,
                  cursor: "pointer"
               }
            }
         }
         elevation={3}
      >
         <CardContent>
            <FontAwesomeIcon
               color = "gold"
               icon = { faLightbulb }
               size = "3x"
            />
            <Typography
               sx = { { fontStyle: "italic", mt: 2, mb: 1 } }
               variant = "h6"
            >
               &quot;{ text }&quot;
            </Typography>
            <Typography
               sx = { { fontWeight: "bold" } }
               variant = "subtitle1"
            >
               - { author }
            </Typography>
         </CardContent>
      </Card>
   );
}

export default function QuotesGrid() {
   return (
      <Box
         id = "quotes"
         sx = { { padding: 4, mt: 4 } }
      >
         <Box
            alt = "Quotes"
            component = "img"
            src = "quotes.svg"
            sx = { { width: 250, height: "auto", mb: 6 } }
         />

         <Grid2
            container = { true }
            spacing = { 3 }
         >
            {
               quotes.map((quote, index) => (
                  <Grid2
                     key = { index }
                     size = { { xs: 12  } }
                  >
                     <QuoteCard quote = { quote } />
                  </Grid2>
               ))
            }
         </Grid2>
      </Box>
   );
}