import "@/styles/landing.scss";

import { faIdCard, faUnlockKeyhole } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Typography } from "@mui/material";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { useNavigate } from "react-router";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export function meta() {
   return [
      { title: "Capital" },
      { name: "description", content: "Finance Tracker" }
   ];
}

export default function Landing() {
   const navigate = useNavigate();

   return (
      <div className = "center">
         <div className = "image">
            <img
               alt = "Landing Page Image"
               src = { `${SERVER_URL}/resources/landing/landing.jpg` }
            />
         </div>
         <Box>
            <Typography
               sx = { { fontWeight: "bold", marginBottom: "10px" } }
               variant = "h2"
            >
               Capital
            </Typography>
            <Typography
               color = "textSecondary"
               sx = { { margin: "0 auto", maxWidth: "90%" } }
               variant = "body2"
            >
               A data-driven finance tracker created for the intelligent acquisition of capital.
            </Typography>
         </Box>
         <Stack
            direction = "row"
            flexWrap = { "wrap" }
            gap = { 1 }
            justifyContent = { "center" }
         >
            <Button
               className = "btn-primary"
               color = "success"
               disableElevation = { true }
               id = "login"
               onClick = { () => navigate("/login") }
               startIcon = { <FontAwesomeIcon icon = { faUnlockKeyhole } /> }
               variant = "contained"
            >
               Log In
            </Button>
            <Button
               className = "btn-primary"
               color = "info"
               disableElevation = { true }
               id = "register"
               onClick = { () => navigate("/login") }
               startIcon = { <FontAwesomeIcon icon = { faIdCard } /> }
               sx = { { backgroundColor: "primary.main" } }
               variant = "contained"
            >
               Register
            </Button>
         </Stack>
      </div>
   );
}