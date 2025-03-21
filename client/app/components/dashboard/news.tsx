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
   Typography
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { type News, type Story } from "capital/news";
import { useState } from "react";

import { Expand } from "@/components/global/expand";
import { timeSinceLastUpdate } from "@/lib/dates";
import { ellipsis } from "@/lib/display";

// Regex to validate MarketWatch image URLs
const MARKET_WATCH_IMAGE_REGEX = /^https:\/\/images\.mktw\.net\/.*/;

// Default values for missing content
const DEFAULT_VALUES = {
   AUTHOR: "No Author",
   TITLE: "No Title",
   DESCRIPTION: "No Description",
   IMAGE: "/svg/backup.svg"
} as const;

interface StoryItemProps extends Story {
   description: string[];
   link: string[];
   pubDate: string[];
   title: string[];
}

function StoryItem({ description, link, pubDate, title, ...rest }: StoryItemProps) {
   const [isResourceError, setIsResourceError] = useState(false);
   const [expanded, setExpanded] = useState(false);

   // Extract and validate story data
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
         { /* Author header with timestamp and external link */ }
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
                  sx = { { ...ellipsis, justifyContent: "space-between", flexWrap: "wrap" } }
               >
                  <Stack spacing = { 0 }>
                     <Typography
                        sx = { { ...ellipsis, maxWidth: "225px" } }
                        variant = "subtitle2"
                     >
                        { author }
                     </Typography>
                     <Typography variant = "caption">
                        { timeSinceLastUpdate(publishDate) }
                     </Typography>
                  </Stack>
                  <IconButton
                     aria-label = "Read More"
                     disableRipple = { true }
                     href = { storyLink }
                     size = "small"
                     target = "_blank"
                  >
                     <FontAwesomeIcon
                        className = "primary"
                        icon = { faUpRightFromSquare }
                        style = { { padding: "0 7px" } }
                     />
                  </IconButton>
               </Stack>
            }
         />
         { /* Story image */ }
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
         { /* Story title */ }
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
         { /* Expand/collapse controls */ }
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
         { /* Expandable description */ }
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
               </Typography>
            </CardContent>
         </Collapse>
      </Card>
   );
}

interface StoriesProps {
   data: News;
}

export default function Stories({ data }: StoriesProps) {
   // Safely access news items with optional chaining
   const newsItems = (data?.channel?.[0]?.item || []).slice(0, 10);

   console.log(newsItems);

   return (
      <Box
         id = "news"
         sx = { { textAlign: "center" } }
      >
         <Stack
            direction = "column"
            sx = { { textAlign: "center", justifyContent: "center", alignItems: "center", gap: 2 } }
         >
            { /* Header image */ }
            <Box className = "animation-container">
               <Box
                  alt = "News"
                  className = "floating"
                  component = "img"
                  src = "/svg/news.svg"
                  sx = { { width: 225, height: "auto", mx: "auto", mt: { xs: 3, lg: 0 } } }
               />
            </Box>
            { /* News grid */ }
            <Grid
               columnSpacing = { 3.1 }
               container = { true }
               sx = { { width: "100%", height: "100%", justifyContent: "center", alignItems: "center", gap: 3.1, mt: 2, textAlign: "left" } }
            >
               {
                  newsItems.map((item: Story, index: number) => (
                     <Grid
                        key = { `news-${index}` }
                        size = { { xs: 12, md: 6, lg: 12 } }
                     >
                        <StoryItem { ...item } />
                     </Grid>
                  ))
               }
            </Grid>
         </Stack>
      </Box>
   );
}