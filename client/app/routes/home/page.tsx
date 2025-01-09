import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button, Container } from "react-bootstrap";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

import { logout } from "@/redux/slices/auth";
import { SERVER_URL } from "@/root";
import { clearAuthentication } from "@/lib/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";


import NavigateButton from "@/components/global/navigate-button";

export default function Home() {
   const dispatch = useDispatch();
   const queryClient = useQueryClient();

   const mutation = useMutation({
      mutationFn: clearAuthentication,
      onSuccess: () => {
         // Update cached authentication status
         queryClient.setQueriesData({ queryKey: "auth" }, false);
         
         // Update Redux store
         dispatch(logout());

         // Navigate to the login page
         window.location.reload();
      },
      onError: (error: any) => {
        console.error(error);
      },
   });
   
   return (
      <Container className="vh-100 d-flex flex-column justify-content-center align-items-center mb-3">
         <h1>
            Home
         </h1>
         <NavigateButton
            navigate={ () => {
               mutation.mutate();
               window.location.reload();
            }}
            className = "icon primary danger"
         >
            <FontAwesomeIcon icon = { faRightFromBracket }/>
            <span>Logout</span>
         </NavigateButton>
      </Container>
   );
}