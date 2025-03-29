/**
 * Represents news data for the dashboard page
 */
export type News = {
   "$": Object;
   "channel": {
      "copyright": string[];
      "description": string[];
      "image": { 
         url: string; 
         title: string; 
         link: string 
      }[];
      "item": NewsArticle[];
      "language": string[];
      "lastBuildDate": string[];
      "link": string[];
      "title": string[];
   }[];
}

/**
 * Represents a news article
 */
export type NewsArticle = {
   "dc:creator": string[];
   "description": string[];
   "link": string[];
   "pubDate": string[];
   "title": string[];
   "media:content"?: { 
      $: { 
         image: string; 
         type: string; 
         url: string 
      } 
   }[];
};