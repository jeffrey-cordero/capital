import "@/styles/landing.scss";

import { faIdCard, faUnlockKeyhole } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { Container, Image } from "react-bootstrap";
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
      <Container className = "main">
         <div className = "image">
            <Image
               alt = "Landing Page Image"
               src = { `${SERVER_URL}/resources/landing/landing.jpg` }
            />
         </div>
         <div className = "text">
            <h1>Capital</h1>
            <p> A data-driven finance tracker created for the intelligent acquisition of capital.</p>
         </div>
         <Stack
            className = "buttons"
            direction = "row"
            flexWrap = { "wrap" }
            spacing = { 1 }
         >
            <Button
               className = "btn-primary"
               color = "success"
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
               id = "register"
               onClick = { () => navigate("/login") }
               startIcon = { <FontAwesomeIcon icon = { faIdCard } /> }
               variant = "contained"
            >
               Register
            </Button>
         </Stack>
      </Container>
   );
}