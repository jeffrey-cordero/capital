import { faCaretDown, faUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Avatar,
   Box,
   Card,
   CardActions,
   CardContent,
   CardHeader,
   CardMedia,
   Collapse,
   IconButton,
   Stack,
   Typography,
   useTheme
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { type News, type NewsArticle } from "capital/news";
import { useState } from "react";
import { useSelector } from "react-redux";

import { Expand } from "@/components/global/expand";
import { displayDate, horizontalScroll } from "@/lib/display";
import type { RootState } from "@/redux/store";

/**
 * Regex to validate external image URLs
 */
const MARKET_WATCH_IMAGE_REGEX = /^https:\/\/images\.mktw\.net\/.*/;

/**
 * Default values for missing article content
 */
const DEFAULT_VALUES = {
   AUTHOR: "No Author",
   TITLE: "No Title",
   DESCRIPTION: "No Description",
   IMAGE: "/svg/backup.svg"
} as const;

/**
 * Props for the NewsItem component
 *
 * @interface NewsItemProps
 * @extends NewsArticle - Inherits all properties from the NewsArticle interface
 * @property {string[]} description - The description of the article
 * @property {string[]} link - The link of the article
 * @property {string[]} pubDate - The publish date of the article
 * @property {string[]} title - The title of the article
 */
interface NewsItemProps extends NewsArticle {
   description: string[];
   link: string[];
   pubDate: string[];
   title: string[];
}

/**
 * NewsItem component to display a single news article
 *
 * @param {NewsItemProps} props - The props for the NewsItem component
 * @returns {React.ReactNode} The NewsItem component
 */
function NewsItem({ description, link, pubDate, title, ...rest }: NewsItemProps): React.ReactNode {
   const theme = useTheme();
   const [isResourceError, setIsResourceError] = useState(false);
   const [expanded, setExpanded] = useState(false);

   // Extract or use default values
   const author = rest["dc:creator"]?.[0] || DEFAULT_VALUES.AUTHOR;
   const authorInitial = author.charAt(0).toUpperCase();
   const image = rest["media:content"]?.[0]?.$.url || DEFAULT_VALUES.IMAGE;
   const storyTitle = title?.[0] || DEFAULT_VALUES.TITLE;
   const storyDescription = description?.[0] || DEFAULT_VALUES.DESCRIPTION;
   const storyLink = link?.[0] || "";
   const publishDate = pubDate?.[0] || new Date().toISOString();

   // Validate image URL and use backup if invalid
   const isValidImage = MARKET_WATCH_IMAGE_REGEX.test(image) && !isResourceError;
   const displayImage = isValidImage ? image : DEFAULT_VALUES.IMAGE;

   return (
      <Card
         elevation = { 3 }
         sx = { { margin: "auto", borderRadius: 2 } }
      >
         <CardHeader
            avatar = {
               <Avatar
                  aria-label = "author"
                  sx = { { bgcolor: "primary", backgroundColor: "primary.main", fontWeight: "medium" } }
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
                        variant = "subtitle2"
                     >
                        { author }
                     </Typography>
                     <Typography variant = "caption">
                        { displayDate(publishDate) }
                     </Typography>
                  </Stack>
               </Stack>
            }
         />
         <Stack sx = { { textAlign: "center", justifyContent: "center", alignItems: "center" } }>
            <CardMedia
               alt = "Story Image"
               component = "img"
               image = { displayImage }
               onError = { () => setIsResourceError(true) }
               sx = {
                  {
                     objectFit: { xs: "contain", md: "cover" },
                     objectPosition: "center center",
                     height: { xs: "auto", md: "200px" },
                     backgroundColor: "white"
                  }
               }
               title = "News"
            />
         </Stack>
         <CardContent sx = { { pb: 1 } }>
            <Typography
               sx = {
                  {
                     display: "-webkit-box",
                     WebkitBoxOrient: "vertical",
                     overflow: "hidden",
                     WebkitLineClamp: { sm: "none", md: 2 },
                     minHeight: { sm: "none", md: "40.031px" },
                     textOverflow: "ellipsis",
                     fontWeight: "medium",
                     mr: 2
                  }
               }
               variant = "body2"
            >
               { storyTitle }
            </Typography>
         </CardContent>
         <CardActions sx = { { justifyContent: "flex-end", px: 1, pb: 1, pt: 0 } }>
            <Expand
               disableRipple = { true }
               expand = { expanded }
               onClick = { () => setExpanded(!expanded) }
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
                  variant = "body2"
               >
                  { storyDescription }
                  <IconButton
                     aria-label = "Read More"
                     disableRipple = { true }
                     href = { storyLink }
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
   const news: News = useSelector((state: RootState) => state.markets.value.news);
   const items = (news?.channel?.[0]?.item || []).slice(0, 10);

   return (
      <Box
         id = "news"
         sx = { { textAlign: "center" } }
      >
         <Stack
            direction = "column"
            sx = { { textAlign: "center", justifyContent: "center", alignItems: "center", gap: 2 } }
         >
            <Box className = "animation-container">
               <Box
                  alt = "News"
                  className = "floating"
                  component = "img"
                  src = "/svg/news.svg"
                  sx = { { width: 225, height: "auto", mx: "auto", mt: { xs: 3, lg: 0 } } }
               />
            </Box>
            <Grid
               columnSpacing = { 3.1 }
               container = { true }
               sx = { { width: "100%", height: "100%", justifyContent: "center", alignItems: "center", gap: 3.1, mt: 2, textAlign: "left" } }
            >
               {
                  items.map((item, index) => (
                     <Grid
                        key = { `news-${index}` }
                        size = { { xs: 12, md: 6, lg: 12 } }
                     >
                        <NewsItem { ...item } />
                     </Grid>
                  ))
               }
            </Grid>
         </Stack>
      </Box>
   );
}