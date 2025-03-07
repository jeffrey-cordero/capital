import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { Outlet, useNavigate } from "react-router";

import Loading from "@/components/global/loading";
import { fetchAuthentication } from "@/tanstack/queries/authenticationQueries";

export default function Layout() {
   // Fetch authentication status within the initial landing pages to potentially redirect to the dashboard
   const dispatch = useDispatch(), navigate = useNavigate();
   const { data, isLoading } = useQuery({
      queryKey: ["authentication"],
      queryFn: () => fetchAuthentication(dispatch, navigate),
      staleTime: Infinity
   });

   if (isLoading || data === null) {
      return <Loading />;
   } else {
      return <Outlet />;
   }
}