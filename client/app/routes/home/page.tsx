import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Col, Container, Row } from "react-bootstrap";
import { useDispatch } from "react-redux";

import NavigateButton from "@/components/global/navigate-button";
import { clearAuthentication } from "@/lib/auth";
import { logout } from "@/redux/slices/auth";
import Stories from "@/components/home/stories";
import Chart from "@/components/home/chart";

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
      }
   });

   return (
      <Container fluid className="vw-100 d-flex flex-column justify-content-center align-items-center mb-3">
      <Row className="w-100">
         {/* Main content on left side */}
         <Col xs={12} md={8} className="vh-100">
            <div className="d-flex flex-column justify-content-between align-items-center gap-3">
               {/* main stuff goes here */}
               <div>
                  <Chart />
               </div>
               
               <NavigateButton
                  className="icon primary danger"
                  navigate={() => {
                     mutation.mutate();
                     window.location.reload();
                  }}
               >
                  <FontAwesomeIcon icon={faRightFromBracket} />
                  <span>Logout</span>
               </NavigateButton>
            </div>
         </Col>

         {/* Stories on right side for large screens, takes its own row on smaller screens */}
         <Col lg={12} xl={4}>
            <div>
               <Stories />
            </div>
         </Col>
      </Row>
   </Container>
   );
}