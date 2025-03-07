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
import { useRef, useState } from "react";

import { Expand } from "@/components/global/expand";
import { timeSinceLastUpdate } from "@/lib/dates";
import { ellipsis } from "@/lib/display";

const imageRegex = /https:\/\/images\.mktw\.net\/.*/;

function StoryItem({ description, link, pubDate, title, ...rest }: Story) {
   const [isResourceError, setIsResourceError] = useState(false);
   const [expanded, setExpanded] = useState(false);
   const author = rest["dc:creator"] || ["No Author"];
   const image = rest["media:content"]?.[0]?.$.url || "/svg/backup.svg";

   return (
      <Card
         elevation = { 3 }
         sx = { { margin: "auto", borderRadius: 2 } }
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
                        sx = { { ...ellipsis, maxWidth: { xs: "300px", sm: "200px", md: "300px" } } }
                        variant = "subtitle2"
                     >
                        { author.join(", ") }
                     </Typography>
                     <Typography variant = "caption">
                        { timeSinceLastUpdate(pubDate[0] || new Date().toISOString()) }
                     </Typography>
                  </Stack>
                  <IconButton
                     aria-label = "Read More"
                     disableRipple = { true }
                     href = { link[0] || "#" }
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
         <Stack sx = { { textAlign: "center", justifyContent: "center", alignItems: "center" } }>
            <CardMedia
               alt = "Story Image"
               component = "img"
               image = { imageRegex.test(image) && !isResourceError ? image : "/svg/backup.svg" }
               onError = { () => setIsResourceError(true) }
               sx = {
                  {
                     objectFit: "cover",
                     objectPosition: "center center",
                     height: {
                        xs: "300px",
                        sm: "200px"
                     },
                     backgroundColor: "white"
                  }
               }
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
                     minHeight: { sm: "none", md: "60.5px" },
                     textOverflow: "ellipsis",
                     fontWeight: "medium",
                     mr: 2
                  }
               }
               variant = "body2"
            >
               { title?.[0] || "No Title" }
            </Typography>
         </CardContent>
         <CardActions sx = { { justifyContent: "flex-end", px: 1, pb: 1 } }>
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
                  { description?.[0] || "No Description" }
               </Typography>
            </CardContent>
         </Collapse>
      </Card>
   );
}

export default function Stories({ data }: { data: News }) {
   const containerRef = useRef<HTMLDivElement>(null);

   return (
      <Box
         id = "news"
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
                  src = "/svg/news.svg"
                  sx = { { width: 225, height: "auto", mx: "auto" } }
               />
            </Box>
            <Grid
               columnSpacing = { 3.1 }
               container = { true }
               sx = { { width: "100%", height: "100%", justifyContent: "center", alignItems: "center", gap: 3.1, mt: 2, textAlign: "left" } }
            >
               {
                  data?.channel[0]?.item.map(
                     (item: Story, index: number) => {
                        return (
                           <Grid
                              key = { `news-${index}` }
                              size = { { xs: 12, sm: 6, lg: 12 } }
                           >
                              <StoryItem
                                 { ...item }

                              />
                           </Grid>
                        );
                     }
                  )
               }
            </Grid>
         </Stack>
      </Box>

   );
}