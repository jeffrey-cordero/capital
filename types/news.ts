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
      "item": Story[];
      "language": string[];
      "lastBuildDate": string[];
      "link": string[];
      "title": string[];
   }[];
}

export type Story = {
   "author": string[];
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