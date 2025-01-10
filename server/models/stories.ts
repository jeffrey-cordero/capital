const fs = require("fs").promises;
import { redisClient } from "@/app";
import { parseString } from "xml2js";

function parseXML (xml: string): Promise<Object> {
   return new Promise((resolve, reject) => {
      parseString(xml, (error: any, data: { rss: Object }) => {
         if (error) {
            reject(error);
         } else {
            resolve(data.rss);
         }
      });
   });
}

export class Stories {
   data: Object;

   constructor(data: Object) {
      this.data = data;
   }

   static async fetchStories(): Promise<Object> {
      // Assumes financial stories data is not cached
      try {
         const response = await fetch("https://feeds.content.dowjones.io/public/rss/mw_topstories");
         const data = await parseXML(await response.text());
         
         await redisClient.set("stories", JSON.stringify(data));
         
         return data;
      } catch (error) {
         // Use backup XML Feed
         console.error(error);
         
         const xmlBackup = await fs.readFile("resources/home/stories.xml", "utf8");
         const data = await parseXML(xmlBackup);

         await redisClient.set("stories", JSON.stringify(data));

         return data;
      }
   }

}