import "@/styles/landing.scss";

import { faIdCard, faUnlockKeyhole } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Container, Image } from "react-bootstrap";
import { useNavigate } from "react-router";

import NavigateButton from "@/client/app/components/global/navigate-button";

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
         <div className = "buttons">
            <NavigateButton
               className = "primary icon"
               id = "login"
               navigate = { () => navigate("/login") }
            >
               <FontAwesomeIcon icon = { faUnlockKeyhole } />
               <span>Log In</span>
            </NavigateButton>
            <NavigateButton
               className = "primary icon"
               id = "register"
               navigate = { () => navigate("/register") }
            >
               <FontAwesomeIcon icon = { faIdCard } />
               <span>Register</span>
            </NavigateButton>
         </div>
      </Container>
   );
}