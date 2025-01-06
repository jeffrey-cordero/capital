import { SERVER_URL } from "@/root";
import { Button } from "react-bootstrap";
import { useNavigate } from "react-router";

export default function Home() {
   const navigate = useNavigate();

   const logout = async () => {
      try {
         const response = await fetch(`${SERVER_URL}/auth/logout`, {
            method: "POST",
            headers: {
               "Content-Type": "application/json",
            },
         });

         if (response.ok) {
            navigate("/login");
         } else {
            console.error("Failed to logout");
         }
      } catch (error) {
         console.error(error);
      }
   }
   return (
      <div>
         <h1>
            Home
         </h1>
         <Button onClick={logout}>Logout</Button>
      </div>
   )
}