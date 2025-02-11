import { faCaretDown, faUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Avatar, Box, Card, CardActions, CardContent, CardHeader, CardMedia, Collapse, IconButton, type IconButtonProps, Stack, styled, Typography } from "@mui/material";
import { type News, type Story } from "capital-types/news";
import { useRef, useState } from "react";

const imageRegex = /https:\/\/images\.mktw\.net\/.*/;

export function timeSinceLastUpdate(date: string) {
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
   const image = props["media:content"]?.[0].$.url || "/backup.svg";

   return (
      <Card
         elevation = { 3 }
         sx = {
            {
               width: {
                  xs: 200,
                  sm: 300,
                  lg: 400
               },
               borderRadius: 2
            }
         }
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
               <Stack
                  direction = "row"
                  sx = { { justifyContent: "space-between" } }
               >
                  <Stack spacing = { 0 }>
                     <Typography
                        sx = { { whiteSpace: "nowrap", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis" } }
                        variant = "subtitle2"
                     >
                        { author.join(", ") }
                     </Typography>
                     <Typography variant = "caption">
                        { timeSinceLastUpdate(pubDate[0]) }
                     </Typography>
                  </Stack>
                  <IconButton
                     aria-label = "Read More"
                     className = "news"
                     href = { link[0] }
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
         <Stack sx = { { textAlign:"center", justifyContent: "center", alignItems: "center" } }>
            <CardMedia
               alt = "Story Image"
               component = "img"
               image = { imageRegex.test(image) && !isResourceError ? image : "/backup.svg" }
               onError = { () => setIsResourceError(true) }
               sx = { { maxHeight: "200px", minHeight: "200px", height: "200px" } }
               title = "News"
            />
         </Stack>
         <CardContent>
            <Typography
               sx = {
                  {
                     display: "-webkit-box",
                     WebkitBoxOrient: "vertical",
                     overflow: "hidden",
                     WebkitLineClamp: 3,
                     minHeight: "60.5px",
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
         <CardActions sx = { { justifyContent: "flex-end", px: 1, pb: 1 } }>
            <ExpandMore
               aria-expanded = { expanded }
               aria-label = "show more"
               expand = { expanded }
               onClick = { () => setExpanded(!expanded) }
            >
               <FontAwesomeIcon
                  icon = { faCaretDown }
                  style = { { padding: "0 5px" } }
               />
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
   news: News;
}

export default function Stories(props: NewsProps) {
   const { news } = props;
   const containerRef = useRef<HTMLDivElement>(null);

   return (
      Object.keys(news).length > 0 ? (
         <Box
            id = "news"
            marginTop = { { xs: 4, lg: 0 } }
            ref = { containerRef }
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
                     src = "news.svg"
                     sx = { { width: 250, height: "auto", mx: "auto", mb: 2 } }
                  />
               </Box>
               <Stack
                  direction = { { xs: "row"  } }
                  sx = { { flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 4, textAlign: "left" } }
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
            </Stack>
         </Box>
      ) : (
         null
      )
   );
}