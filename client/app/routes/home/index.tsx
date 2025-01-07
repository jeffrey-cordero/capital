import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button, Container } from "react-bootstrap";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

import { logout } from "@/redux/slices/auth";
import { SERVER_URL } from "@/root";

export default function Home() {
   const dispatch = useDispatch();
   const navigate = useNavigate();

   const endSession = async() => {
      try {
         const response = await fetch(`${SERVER_URL}/auth/logout`, {
            method: "POST",
            headers: {
               "Content-Type": "application/json"
            },
            credentials: "include"
         });

         if (response.ok) {
            dispatch(logout());
            navigate("/login");
         } else {
            console.error("Failed to logout");
         }
      } catch (error) {
         console.error(error);
      }
   };
   return (
      <Container>
         <h1>
            Home
         </h1>
         <Button
            onClick = { endSession }
            variant = "danger"
            className = "icon"
         >
            <FontAwesomeIcon icon = { faRightFromBracket }/>
            <span>Logout</span>
         </Button>
      </Container>
   );
}