import { faArrowUpRightFromSquare, faCaretDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Avatar, Box, Card, CardActions, CardContent, CardHeader, CardMedia, Collapse, IconButton, type IconButtonProps, Slide, Stack, styled, Typography } from "@mui/material";
import { type Feed, type Story } from "capital-types/news";
import { useRef, useState } from "react";

import { SERVER_URL } from "@/lib/server";

const imageRegex = /https:\/\/images\.mktw\.net\/.*/;

function timeSinceLastUpdate(date: string) {
   // Calculate the difference in milliseconds
   const difference = new Date().getTime() - new Date(date).getTime();

   // Convert to time units
   const minutes = Math.floor(difference / 60000);
   const hours = Math.floor(minutes / 60);
   const days = Math.floor(hours / 24);

   // Determine the appropriate output string
   if (minutes === 0) {
      return "now";
   } else {
      const parts = [];

      if (days >= 1) parts.push(`${days} day${days > 1 ? "s" : ""}`);
      if (hours >= 1) parts.push(`${hours % 24} hour${hours % 24 > 1 ? "s" : ""}`);
      if (minutes >= 1) parts.push(`${minutes % 60} minute${minutes % 60 > 1 ? "s" : ""}`);

      return parts.join(", ") + " ago";
   }
}

interface ExpandMoreProps extends IconButtonProps {
  expand: boolean;
}

const ExpandMore = styled((props: ExpandMoreProps) => {
   // eslint-disable-next-line
   const { expand, ...other } = props;
   return <IconButton { ...other } />;
})(({ theme }) => ({
   margin: "0",
   padding: "0 8px",
   transition: theme.transitions.create("transform", {
      duration: theme.transitions.duration.standard,
      easing: theme.transitions.easing.easeInOut
   }),
   variants: [
      {
         props: ({ expand }) => !expand,
         style: {
            transform: "rotate(0deg)"
         }
      },
      {
         props: ({ expand }) => !!expand,
         style: {
            transform: "rotate(180deg)"
         }
      }
   ]
}));

function StoryItem(props: Story) {
   const { author, description, link, pubDate, title } = props;
   const [isResourceError, setIsResourceError] = useState(false);
   const [expanded, setExpanded] = useState(false);
   const image = props["media:content"]?.[0].$.url || `${SERVER_URL}/resources/home/story.jpg}`;

   return (
      <Card
         elevation = { 3 }
         sx = { { width: 345, borderRadius: 4 } }
      >
         <CardHeader
            avatar = {
               <Avatar
                  aria-label = "recipe"
                  sx = { { bgcolor: "primary", backgroundColor: "primary.main", fontWeight: "medium" } }
               >
                  { author[0].charAt(0).toUpperCase() }
               </Avatar>
            }
            title = {
               <Stack spacing = { 0 }>
                  <Typography variant = "subtitle2">
                     { author }
                  </Typography>
                  <Typography variant = "caption">
                     { timeSinceLastUpdate(pubDate[0]) }
                  </Typography>
               </Stack>
            }
         />
         <CardMedia
            alt = "Story Image"
            component = "img" 
            sx= {{ maxHeight: "200px", minHeight: "200px", height: "200px" }}
            image = { imageRegex.test(image) && !isResourceError ? image : `${SERVER_URL}/resources/home/story.jpg` }
            onError = { () => setIsResourceError(true) }
            title = "News"
         />
         <CardContent>
            <Typography
               sx = {
                  {
                     display: "-webkit-box",
                     WebkitBoxOrient: "vertical",
                     overflow: "hidden",
                     WebkitLineClamp: 3,
                     textOverflow: "ellipsis",
                     fontWeight: "medium",
                     mr: 2
                  }
               }
               variant = "body2"
            >
               { title[0] }
            </Typography>
         </CardContent>
         <CardActions sx = { { justifyContent:"space-between", px: 1, pb: 1 } }>
            <IconButton
               aria-label = "Read More"
               href = { link[0] }
               size = "small"
               target = "_blank"
            >
               <FontAwesomeIcon
                  className = "primary"
                  icon = { faArrowUpRightFromSquare }
               />
            </IconButton>
            <ExpandMore
               aria-expanded = { expanded }
               aria-label = "show more"
               expand = { expanded }
               onClick = { () => setExpanded(!expanded) }
            >
               <FontAwesomeIcon icon = { faCaretDown } />
            </ExpandMore>
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
                  { description[0] }
               </Typography>
            </CardContent>
         </Collapse>
      </Card>
   );
}

interface NewsProps {
  news: Feed;
}

export default function News(props: NewsProps) {
   const { news } = props;
   const containerRef = useRef<HTMLDivElement>(null);

   return (
      Object.keys(news).length > 0 ? (
         <Box
            ref = { containerRef }
            sx = { { overflow: "hidden", textAlign: "center" } }
            marginTop = { { xs: 4, lg: 0 } }
         >
            <Box
               component="img"
               src="news.svg"
               alt="News"
               sx={{ width: 250, height: "auto", mb: 4 }}
            />
            <Stack
               direction = { { xs: "row", lg: "column" } }
               sx = { { flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 3, textAlign: "left" } }
            >
               {
                  news?.channel[0].item.map(
                     (item: Story, index: number) => {
                        return (
                           <Slide
                              container = { containerRef.current }
                              direction = "down"
                              in = { false }
                              key = { `slide-${index}` }
                              timeout = { 10000 }
                           >
                              <StoryItem
                                 { ...item }
                                 key = { `story-${index}` }
                              />
                           </Slide>
                        );
                     }
                  )
               }
            </Stack>
         </Box>
      ) : (
         null
      )
   );
}