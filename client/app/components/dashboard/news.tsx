import { faCaretDown, faUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Avatar,
   Card,
   CardActions,
   CardContent,
   CardHeader,
   Collapse,
   IconButton,
   Stack,
   Typography,
   useTheme
} from "@mui/material";
import { type Article, type News } from "capital/economy";
import { useCallback, useMemo, useState } from "react";
import { useSelector } from "react-redux";

import Expand from "@/components/global/expand";
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
 * Displays a single news article in a collapsible card
 *
 * @param {{ article: Article; index: number }} props - Article card props
 * @returns {React.ReactNode} The ArticleCard component
 */
function ArticleCard({ article, index }: { article: Article; index: number }): React.ReactNode {
   const theme = useTheme();
   const [expanded, setExpanded] = useState(false);

   // Normalize the article content
   const author = article.author || article.domain || DEFAULT_VALUES.AUTHOR;
   const authorInitial = author.charAt(0).toUpperCase();
   const publishDate = new Date(article.published).toLocaleString() || new Date().toLocaleString();
   const title = article.title || DEFAULT_VALUES.TITLE;
   const description = article.text.replace(/(?<!\n)\n(?!\n)/g, "\n\n") || DEFAULT_VALUES.DESCRIPTION;
   const link = article.url || "";

   const toggleExpandedState = useCallback(() => {
      setExpanded((prev) => !prev);
   }, []);

   return (
      <Card
         data-expanded = { expanded }
         data-testid = { `news-article-container-${index}` }
         elevation = { 3 }
         sx = { { margin: "auto", borderRadius: 2, width: "100%", textAlign: "left" } }
      >
         <CardHeader
            avatar = {
               <Avatar
                  aria-label = "author"
                  data-testid = { `news-article-author-avatar-${index}` }
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
                        data-testid = { `news-article-author-${index}` }
                        sx = { { fontWeight: "500" } }
                        variant = "subtitle2"
                     >
                        { author }
                     </Typography>
                     <Typography
                        data-testid = { `news-article-publish-date-${index}` }
                        variant = "caption"
                     >
                        { publishDate }
                     </Typography>
                  </Stack>
               </Stack>
            }
         />
         <CardContent sx = { { py: 0, px: "auto" } }>
            <Typography
               data-testid = { `news-article-title-${index}` }
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
               data-testid = { `news-article-expand-button-${index}` }
               disableRipple = { true }
               expand = { expanded }
               onClick = { toggleExpandedState }
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
                  data-testid = { `news-article-description-${index}` }
                  sx = { { whiteSpace: "pre-wrap" } }
                  variant = "body2"
               >
                  { description }
                  <IconButton
                     aria-label = "Read More"
                     data-testid = { `news-article-link-${index}` }
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
 * Displays financial news articles in a responsive grid
 *
 * @returns {React.ReactNode} The Articles component
 */
export default function Articles(): React.ReactNode {
   const news: News = useSelector((state: RootState) => state.economy.value.news);
   const items: Article[] = useMemo(() => {
      return [...news.response.data].reverse().slice(0, 20);
   }, [news]);

   return (
      <Stack
         data-testid = "news-section"
         direction = "column"
         id = "news"
         sx = { { height: "100%", textAlign: "center", justifyContent: "space-between", alignItems: "center", gap: 2 } }
      >
         {
            items.map((item: Article, index) => (
               <ArticleCard
                  article = { item }
                  index = { index }
                  key = { `news-article-${index}` }
               />
            ))
         }
      </Stack>
   );
}