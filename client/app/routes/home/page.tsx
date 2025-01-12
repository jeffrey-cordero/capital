import "@/styles/home.scss";

import Button from '@mui/material/Button';
import Stack from "@mui/material/Stack";
import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import type { Feed } from "capital-types/news";
import type { Stocks } from "capital-types/stocks";
import { Col, Container, Row } from "react-bootstrap";
import { useDispatch } from "react-redux";

import Loading from "@/components/global/loading";
import News from "@/components/home/news";
import MonthlyStocks from "@/components/home/stocks";
import { clearAuthentication } from "@/lib/auth";
import { logout } from "@/redux/slices/auth";
import { SERVER_URL } from "@/root";

async function fetchNews(): Promise<Feed> {
   try {
      const response = await fetch(`${SERVER_URL}/home/news`, {
         method: "GET",
         headers: {
            "Content-Type": "application/json"
         },
         credentials: "include"
      });

      const result = await response.json();

      return result.data.news as Feed;
   } catch (error) {
      console.error(error);

      return {} as Feed;
   }
}

async function fetchStocks(): Promise<Stocks> {
   try {
      const response = await fetch(`${SERVER_URL}/home/stocks`, {
         method: "GET",
         headers: {
            "Content-Type": "application/json"
         },
         credentials: "include"
      });

      const result = await response.json();

      return JSON.parse(result.data.stocks);
   } catch (error) {
      console.error(error);

      return {};
   }
}

export default function Home() {
   const dispatch = useDispatch();
   const queryClient = useQueryClient();

   const homeQueries = useQueries({
      queries: [
         { queryKey: ["stocks"], queryFn: fetchStocks, staleTime: 60 * 60 * 1000, gcTime: 60 * 60 * 1000 },
         { queryKey: ["news"], queryFn: fetchNews, staleTime: 60 * 60 * 1000, gcTime: 60 * 60 * 1000 }
      ]
   });

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

   const [stocks, news] = homeQueries;
   const isLoading: boolean = stocks.isLoading || news.isLoading;

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
                     <MonthlyStocks
                        stocks = { stocks.data as Stocks }
                     />
                     <Stack spacing={2} direction="row">
                        <Button variant="text">Text</Button>
                        <Button variant="contained" color="warning" className="icon">
                           <FontAwesomeIcon icon = { faRightFromBracket } />
                           <span>Logout</span>
                        </Button>
                        <Button variant="outlined">Outlined</Button>
                     </Stack>
                     <Button
                        className = "icon primary danger"
                        onClick = {
                           () => {
                              mutation.mutate();
                              window.location.reload();
                           }
                        }
                        startIcon = { <FontAwesomeIcon icon = { faRightFromBracket } /> }
                     >
                        Logout
                     </Button>
                  </div>
               </Col>
               <Col
                  lg = { 12 }
                  xl = { 4 }
               >
                  <News
                     news = { news.data as Feed }
                  />
               </Col>
            </Row>
         </Container>
      ) : (
         <Loading />
      )
   );
}