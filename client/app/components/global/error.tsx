
import { Box, Container, Link, Typography } from "@mui/material";

import Callout from "@/components/global/callout";

export default function Error() {
   return (
      <Container className = "center">
         <Callout
            sx = { { width: "100%" } }
            type = "error"
         >
            <Box
               alt = "Error"
               component = "img"
               src = "error.svg"
               sx = { { width: 250, height: "auto" } }
            />
            <Typography
               align = "center"
               sx = { { fontWeight: "bold", margin: "0", mb: 2 } }
               variant = "body2"
            >
               Oops, Something went wrong. If the issue persists, please visit this { " " }
               <Link
                  color = "primary"
                  fontWeight = "bold"
                  href = "/"
                  underline = "none"
               >
                  page
               </Link>
            </Typography>
         </Callout>
      </Container>
   );
}