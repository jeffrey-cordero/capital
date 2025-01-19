
import { Container } from "@mui/material";

import Callout from "@/components/global/callout";
import { SERVER_URL } from "@/root";

export default function Error() {
   return (
      <Container className = "center">
         <Callout type = "error">
            <div className = "image">
               <img
                  alt = "Error Image"
                  src = { `${SERVER_URL}/resources/shared/error.jpg` }
               />
               <p>Oops, Something went wrong. If the issue persists, please visit this <a href = "/">page</a>.</p>
            </div>
         </Callout>
      </Container>
   );
}