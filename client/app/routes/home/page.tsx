import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { Col, Container, Row } from "react-bootstrap";
import { useDispatch } from "react-redux";

import Loading from "@/client/app/components/global/loading";
import NavigateButton from "@/client/app/components/global/navigate-button";
import MonthlyStocks, { fetchStocks } from "@/client/app/components/home/stocks";
import Stories, { fetchStories } from "@/client/app/components/home/stories";
import { clearAuthentication } from "@/client/app/lib/auth";
import { logout } from "@/client/app/redux/slices/auth";

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

   const homeQueries = useQueries({
      queries: [{ queryKey: ["stocks"], queryFn: fetchStocks }, { queryKey: ["stories"], queryFn: fetchStories }]
   });

   const [stocks, stories] = homeQueries;
   const isLoading: boolean = stocks.isLoading || stories.isLoading;

   return (
      !isLoading ? (
         <Container
            className = "vw-100 d-flex flex-column justify-content-center align-items-center mb-3"
            fluid = { true }
         >
            <Row className = "w-100">
               <Col
                  className = "vh-100"
                  md = { 8 }
                  xs = { 12 }
               >
                  <div className = "d-flex flex-column justify-content-between align-items-center gap-3">
                     <MonthlyStocks />
                     <NavigateButton
                        className = "icon primary danger"
                        navigate = {
                           () => {
                              mutation.mutate();
                              window.location.reload();
                           }
                        }
                     >
                        <FontAwesomeIcon icon = { faRightFromBracket } />
                        <span>Logout</span>
                     </NavigateButton>
                  </div>
               </Col>
               <Col
                  lg = { 12 }
                  xl = { 4 }
               >
                  <Stories />
               </Col>
            </Row>
         </Container>
      ) : (
         <Loading />
      )
   );
}