import { Image } from "react-bootstrap";

import { SERVER_URL } from "@/client/app/root";

export default function Error() {
   return (
      <div className = "main">
         <div className = "image">
            <Image
               alt = "Error Image"
               src = { `${SERVER_URL}/resources/shared/error.jpg` }
            />
            <p>Oops, Something went wrong. If the issue persists, please visit this <a href = "/">page</a>.</p>
         </div>
      </div>
   );
}