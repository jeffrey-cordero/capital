
import { SERVER_URL } from "@/root";
import Callout from "@/components/global/callout";

export default function Error() {
   return (
      <div className = "main">
         <Callout type="error">
            <div className = "image">
               <img
                  alt = "Error Image"
                  src = { `${SERVER_URL}/resources/shared/error.jpg` }
               />
               <p>Oops, Something went wrong. If the issue persists, please visit this <a href = "/">page</a>.</p>
            </div>
         </Callout>
      </div>
   );
}