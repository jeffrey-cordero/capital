import { faCaretDown, faUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Avatar,
   Box,
   Card,
   CardActions,
   CardContent,
   CardHeader,
   Collapse,
   IconButton,
   Stack,
   Typography,
   useMediaQuery,
   useTheme
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { type News, type Article } from "capital/economy";
import { useCallback, useMemo, useState } from "react";
import { useSelector } from "react-redux";

import { Expand } from "@/components/global/expand";
import { horizontalScroll } from "@/lib/display";
import type { RootState } from "@/redux/store";

/**
 * Default values for missing article content
 */
const DEFAULT_VALUES = {
   AUTHOR: "No Author",
   TITLE: "No Title",
   DESCRIPTION: "No Description"
} as const;

/**
 * NewsItem component to display a single news article
 *
 * @param {NewsItemProps} props - The props for the NewsItem component
 * @returns {React.ReactNode} The NewsItem component
 */
function NewsItem({ article }: { article: Article }): React.ReactNode {
   const theme = useTheme();
   const [expanded, setExpanded] = useState(false);
   const isDesktop = useMediaQuery((theme) => theme.breakpoints.up("lg"));

   const author = article.author || article.domain || DEFAULT_VALUES.AUTHOR;
   const authorInitial = author.charAt(0).toUpperCase();
   const publishDate = new Date(article.published).toLocaleString() || new Date().toLocaleString();
   const title = article.title || DEFAULT_VALUES.TITLE;
   const description = article.text.replace(/\n/g, "\n\n") || DEFAULT_VALUES.DESCRIPTION;
   const link = article.url || "";

   const updateExpandedState = useCallback(() => {
      const financesContainer = document.getElementById("finances-container") as HTMLElement;

      setExpanded((prev) => {
         if (!isDesktop) return !prev;

         const isExpanding = prev === false;
         const expanded = document.querySelectorAll("[data-expanded=\"true\"]").length + (isExpanding ? 1 : -1);

         // Align dashboard height based on the number of expanded cards
         if (expanded > 0) {
            financesContainer.setAttribute("style", "justify-content: flex-start !important;"); // not-flush
         } else {
            financesContainer.setAttribute("style", "justify-content: space-between !important;"); // flush
         }

         return !prev;
      });
   }, [isDesktop]);

   return (
      <Card
         data-expanded = { expanded }
         elevation = { 3 }
         sx = { { margin: "auto", borderRadius: 2 } }
      >
         <CardHeader
            avatar = {
               <Avatar
                  aria-label = "author"
                  sx = { { color: "white", backgroundColor: "primary.main", fontWeight: "medium" } }
               >
                  { authorInitial }
               </Avatar>
            }
            title = {
               <Stack
                  direction = "row"
                  sx = { { ...horizontalScroll(theme), justifyContent: "space-between", maxWidth: "90%" } }
               >
                  <Stack spacing = { 0 }>
                     <Typography
                        sx = { { fontWeight: "500" } }
                        variant = "subtitle2"
                     >
                        { author }
                     </Typography>
                     <Typography variant = "caption">
                        { publishDate }
                     </Typography>
                  </Stack>
               </Stack>
            }
         />
         <CardContent sx = { { py: 0, px: "auto" } }>
            <Typography
               sx = {
                  {
                     display: "-webkit-box",
                     WebkitBoxOrient: "vertical",
                     overflow: "hidden",
                     WebkitLineClamp: { sm: "none", md: 2 },
                     minHeight: { sm: "none", md: "40.031px" },
                     textOverflow: "ellipsis",
                     fontWeight: "550",
                     mr: 2
                  }
               }
               variant = "body2"
            >
               { title }
            </Typography>
         </CardContent>
         <CardActions sx = { { justifyContent: "flex-end", px: 1, pt: 1, pb: 1, mt: -2 } }>
            <Expand
               disableRipple = { true }
               expand = { expanded }
               onClick = { updateExpandedState }
            >
               <FontAwesomeIcon
                  icon = { faCaretDown }
                  style = { { padding: "0 5px" } }
               />
            </Expand>
         </CardActions>
         <Collapse
            in = { expanded }
            timeout = "auto"
            unmountOnExit = { true }
         >
            <CardContent sx = { { p: "0 15px" } }>
               <Typography
                  color = "textSecondary"
                  sx = { { whiteSpace: "pre-wrap" } }
                  variant = "body2"
               >
                  { description }
                  <IconButton
                     aria-label = "Read More"
                     disableRipple = { true }
                     href = { link }
                     size = "small"
                     sx = { { pl: 1 } }
                     target = "_blank"
                  >
                     <FontAwesomeIcon
                        className = "primary"
                        icon = { faUpRightFromSquare }
                        size = "xs"
                     />
                  </IconButton>
               </Typography>
            </CardContent>
         </Collapse>
      </Card>
   );
}

/**
 * Articles component to display the news articles
 *
 * @returns {React.ReactNode} The Articles component
 */
export default function Articles(): React.ReactNode {
   const news: News = useSelector((state: RootState) => state.economy.value.news);
   const items: Article[] = useMemo(() => {
      // Articles based on published date descending
      return [...news.response.data].reverse().slice(0, 24);
   }, [news]);

   return (
      <Box
         id = "news"
         sx = { { textAlign: "center" } }
      >
         <Box
            alt = "News"
            component = "img"
            src = "/svg/news.svg"
            sx = { { height: 240, mb: 2 } }
         />
         <Stack
            direction = "column"
            sx = { { textAlign: "center", justifyContent: "center", alignItems: "center", gap: 2 } }
         >
            <Grid
               columnSpacing = { 2 }
               container = { true }
               sx = { { width: "100%", height: "100%", justifyContent: "center", alignItems: "flex-start", gap: 2, mt: 2, textAlign: "left" } }
            >
               {
                  items.map((item: Article, index) => (
                     <Grid
                        key = { `news-${index}` }
                        size = { { xs: 12, md: 6, lg: 12 } }
                     >
                        <NewsItem article = { item } />
                     </Grid>
                  ))
               }
            </Grid>
         </Stack>
      </Box>
   );
}