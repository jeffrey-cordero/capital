import { Box, Container, Link, Typography } from "@mui/material";
import Stack from "@mui/material/Stack";

export function meta() {
   return [
      { title: "Capital" },
      { author: "Jeffrey Cordero", content: "Finance Tracker" }
   ];
}

export default function Landing() {
   return (
      <Container
         className = "center"
         sx = { { gap: 0, px: 1 } }
      >
         <div className = "floating-container">
            <Box
               alt = "Logo"
               className = "floating-item"
               component = "img"
               src = "logo.svg"
               sx = { { width: 300, height: "auto" } }
            />
         </div>

         <Box sx = { { mt: "-20px" } }>
            <Typography
               sx = { { fontWeight: "bold", marginBottom: "10px" } }
               variant = "h1"
            >
               Capital
            </Typography>
            <Typography
               color = "textSecondary"
               sx = { { margin: "0 auto", fontWeight: "bold", maxWidth: "400px", px: 2 } }
               variant = "body2"
            >
               A data-driven finance tracker created for the intelligent acquisition of capital.
            </Typography>
            <Stack
               direction = "row"
               sx = { { mt: 2, flexWrap: "wrap", justifyContent: "center", gap: "1rem" } }
            >
               <Link
                  fontWeight = "bold"
                  href = "/login"
                  id = "login"
                  underline = "none"
                  variant = "button"
               >
                  Log In
               </Link>
               <Link
                  className = "success"
                  color = "success"
                  fontWeight = "bold"
                  href = "/register"
                  id = "register"
                  underline = "none"
                  variant = "button"
               >
                  Register
               </Link>
            </Stack>
         </Box>
      </Container>
   );
}