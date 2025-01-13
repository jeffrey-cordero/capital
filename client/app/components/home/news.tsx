import { faArrowUpRightFromSquare, faCaretDown, faShareFromSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Avatar, Box, Card, CardActions, CardContent, CardHeader, CardMedia, Collapse, IconButton, type IconButtonProps, Stack, styled, Typography } from "@mui/material";
import { type Feed, type Story } from "capital-types/news";
import { useState } from "react";

import { SERVER_URL } from "@/root";

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
   const { expand, ...other } = props;
   return <IconButton { ...other } />;
})(({ theme }) => ({
   marginLeft: "auto",
   transition: theme.transitions.create("transform", {
      duration: theme.transitions.duration.shortest
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
      <Card sx = { { maxWidth: 345 } }>
         <CardHeader
            avatar = {
               <Avatar
                  aria-label = "recipe"
                  sx = { { bgcolor: "primary" } }
               >
                  { author[0].charAt(0).toUpperCase() }
               </Avatar>
            }
            title = {
               <Stack spacing = { 0 }>
                  <Typography variant = "subtitle2">
                     { author }
                  </Typography>
                  <Typography variant = "subtitle2">
                     { timeSinceLastUpdate(pubDate[0]) }
                  </Typography>
               </Stack>
            }
         />
         <CardMedia
            alt = "Story Image"
            component = "img"
            height = "200"
            image = { imageRegex.test(image) && !isResourceError ? image : `${SERVER_URL}/resources/home/story.jpg` }
            onError = { () => setIsResourceError(true) }
         />
         <CardContent>
            <Typography
               sx = {
                  {
                  // Clamps the title to 3 lines for card height consistency
                     display: "-webkit-box",
                     WebkitBoxOrient: "vertical",
                     overflow: "hidden",
                     WebkitLineClamp: 3,
                     textOverflow: "ellipsis"
                  }
               }
               variant = "body2"
            >
               { title[0] }
            </Typography>
         </CardContent>
         <CardActions disableSpacing = { true }>
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
            <IconButton
               aria-label = "Share"
               onClick = {
                  () => {
                     navigator.share({
                        title: title[0],
                        text: description[0],
                        url: link[0]
                     });
                  }
               }
               size = "small"
            >
               <FontAwesomeIcon
                  className = "primary"
                  icon = { faShareFromSquare }
                  style = { { marginLeft: "1px" } }
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
            <CardContent>
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

   return (
      Object.keys(news).length > 0 ? (
         <Box>
            <div className = "image">
               <img
                  alt = "News"
                  src = { `${SERVER_URL}/resources/home/news.png` }
               />
            </div>
            <Stack
               direction = { { xs: "row", lg: "column" } }
               gap = { 3 }
               sx = { { flexWrap: "wrap", justifyContent: "center", alignContent: "center" } }
            >
               {
                  news?.channel[0].item.map(
                     (item: Story, index: number) => {

                        return (
                           <StoryItem
                              { ...item }
                              key = { index }
                           />
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