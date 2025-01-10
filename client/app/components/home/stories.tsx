import { Card, Container, Image } from "react-bootstrap";

import { SERVER_URL } from "@/root"
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAt, faCalendarDays } from "@fortawesome/free-solid-svg-icons";

interface StoryProps {
   "author": string[];
   "description": string[];
   "link": string[];
   "pubDate": string[];
   "title": string[];
   "media:content": { $: { image: string; type: string; url: string } }[];
}

async function fetchStories(): Promise<{ channel: { item: Array<StoryProps> }[] }> {
   try {
      const response = await fetch(`${SERVER_URL}/home/stories`, {
         method: "GET",
         headers: {
            "Content-Type": "application/json"
         },
         credentials: "include"
      });

      const result = await response.json();

      return result.data.stories;
   } catch (error) {
      console.error(error);

      return { channel: [] };
   }
}

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

      if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
      if (hours > 0) parts.push(`${hours % 24} hour${hours % 24 > 1 ? 's' : ''}`);
      if (minutes > 0) parts.push(`${minutes % 60} minute${minutes % 60 > 1 ? 's' : ''}`);


      return parts.join(", ") + " ago";
   }
}

const imageRegex = /https:\/\/images\.mktw\.net\/.*/;

function Story(props: StoryProps) {
   const { author, description, link, pubDate, title } = props;
   const [isResourceError, setIsResourceError] = useState(false);
   const image = props["media:content"][0].$.url;

   return (
      <Card className="story">
         <div className="story-image">
            <Card.Img
               variant="top"
               src={imageRegex.test(image) && !isResourceError ? image : `${SERVER_URL}/resources/home/story.jpg`}
               onError={() => setIsResourceError(true)}
            />
         </div>
         <Card.Body>
            <Card.Title className="fw-semibold">
               <a href={link[0]} target="_blank">
                  {title}
               </a>
            </Card.Title>
            <Card.Text className="fw-normal fs-6">
               {description}
            </Card.Text>
         </Card.Body>
         <Card.Footer className="d-flex flex-column justify-content-start align-items-start gap-1">
            <div className="d-flex justify-content-start align-items-center gap-2">
               <FontAwesomeIcon icon={faAt} />
               <small className="text-muted">
                  {author[0]}
               </small>
            </div>
            <div className="d-flex justify-content-start align-items-center gap-2">
               <FontAwesomeIcon icon={faCalendarDays} />
               <small className="text-muted">
                  {`Last updated ${timeSinceLastUpdate(pubDate[0])}`}
               </small>
            </div>
         </Card.Footer>
      </Card>
   );
}

export default function Stories() {
   const { data, isLoading } = useQuery({
      queryKey: ["stories"],
      queryFn: fetchStories,
      staleTime: 60 * 60 * 1000,
      gcTime: 60 * 60 * 1000
   });

   return (
      !isLoading ? (
         <Container>
            <div className="image">
               <Image src={`${SERVER_URL}/resources/home/stories.png`} alt="Stories" />
            </div>
            <div className="d-flex flex-column justify-content-center align-items-center gap-3">
               {
                  data?.channel[0].item.map(
                     (item: StoryProps, index: number) => {
                        return (
                           <Story
                              {...item}
                              key={index}
                           />
                        )
                     }
                  )
               }
            </div>
         </Container>
      ) : (
         null
      )
   )
}