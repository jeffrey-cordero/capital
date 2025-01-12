import { faAt, faCalendarDays } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { type Feed, type Story } from "capital-types/news";
import { useState } from "react";
import { Card, Container, Image } from "react-bootstrap";

import { SERVER_URL } from "@/root";

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

      if (days > 0) parts.push(`${days} day${days > 1 ? "s" : ""}`);
      if (hours > 0) parts.push(`${hours % 24} hour${hours % 24 > 1 ? "s" : ""}`);
      if (minutes > 0) parts.push(`${minutes % 60} minute${minutes % 60 > 1 ? "s" : ""}`);

      return parts.join(", ") + " ago";
   }
}

const imageRegex = /https:\/\/images\.mktw\.net\/.*/;

function StoryItem(props: Story) {
   const { author, description, link, pubDate, title } = props;
   const [isResourceError, setIsResourceError] = useState(false);
   const image = props["media:content"][0].$.url;

   return (
      <Card className = "story">
         <div className = "story-image">
            <Card.Img
               onError = { () => setIsResourceError(true) }
               src = { imageRegex.test(image) && !isResourceError ? image : `${SERVER_URL}/resources/home/story.jpg` }
               variant = "top"
            />
         </div>
         <Card.Body>
            <Card.Title className = "fw-semibold">
               <a
                  href = { link[0] }
                  rel = "noreferrer"
                  target = "_blank"
               >
                  { title }
               </a>
            </Card.Title>
            <Card.Text className = "fw-normal fs-6">
               { description }
            </Card.Text>
         </Card.Body>
         <Card.Footer className = "d-flex flex-column justify-content-start align-items-start gap-1">
            <div className = "d-flex justify-content-start align-items-center gap-2">
               <FontAwesomeIcon icon = { faAt } />
               <small className = "text-muted">
                  { author[0] }
               </small>
            </div>
            <div className = "d-flex justify-content-start align-items-center gap-2">
               <FontAwesomeIcon icon = { faCalendarDays } />
               <small className = "text-muted">
                  { `Last updated ${timeSinceLastUpdate(pubDate[0])}` }
               </small>
            </div>
         </Card.Footer>
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
         <Container>
            <div className = "image">
               <Image
                  alt = "News"
                  src = { `${SERVER_URL}/resources/home/news.png` }
               />
            </div>
            <div className = "d-flex flex-column justify-content-center align-items-center gap-3">
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
            </div>
         </Container>
      ) : (
         null
      )
   );
}