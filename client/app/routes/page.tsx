import { Box, Container, Link, Typography } from "@mui/material";
import Stack from "@mui/material/Stack";

export function meta() {
   return [
      { title: "Capital" },
      { author: "Jeffrey Cordero", content: "Finance Tracker" }
   ];
}

export default function Page() {
   return (
      <Container className = "center">
         <Box className = "animation-container">
            <Box
               alt = "Logo"
               className = "floating"
               component = "img"
               src = "/svg/logo.svg"
               sx = { { width: 300, height: "auto" } }
            />
         </Box>
         <Box sx = { { mt: -4 } }>
            <Stack
               direction = "column"
               spacing = { 2 }
            >
               <Typography
                  fontWeight = "bold"
                  variant = "h1"
               >
                  Capital
               </Typography>
               <Typography
                  color = "textSecondary"
                  fontWeight = "bold"
                  sx = { { margin: "0 auto", maxWidth: "400px", px: 2 } }
                  variant = "body2"
               >
                  A data-driven finance tracker created for the intelligent acquisition of capital.
               </Typography>
            </Stack>
            <Stack
               direction = "row"
               spacing = { 2 }
               sx = { { mt: 2, flexWrap: "wrap", justifyContent: "center" } }
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