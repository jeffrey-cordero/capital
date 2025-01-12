import "@/styles/landing.scss";

import { faIdCard, faUnlockKeyhole } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Container, Image } from "react-bootstrap";
import { useNavigate } from "react-router";

import Button from '@mui/material/Button';
import Stack from "@mui/material/Stack";

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
         <Stack className = "buttons" direction = "row" flexWrap={"wrap"} spacing = { 1 }>
            <Button
               id = "login"
               color="success"
               variant="contained"
               className="btn-primary"
               onClick={() => navigate("/login")}
               startIcon = { <FontAwesomeIcon icon = { faUnlockKeyhole } /> }
               
            >
               Log In
            </Button>
            <Button
               id = "register"
               color="info"
               variant="contained"
               className="btn-primary"
               onClick={() => navigate("/login")}
               startIcon = { <FontAwesomeIcon icon = { faIdCard } /> }
            >
               Register
            </Button>
         </Stack>
      </Container>
   );
}