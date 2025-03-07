import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { Outlet, useNavigate } from "react-router";

import Loading from "@/components/global/loading";
import { fetchAuthentication } from "@/tanstack/queries/authenticationQueries";

export default function Layout() {
   // Fetch the authentication status within the landing pages to potentially redirect to the dashboard
   const dispatch = useDispatch(), navigate = useNavigate();
   const { data, isLoading } = useQuery({
      queryKey: ["authentication"],
      queryFn: () => fetchAuthentication(dispatch, navigate),
      staleTime: 5 * 60 * 1000
   });

   if (isLoading || data === null) {
      return <Loading />;
   } else {
      return <Outlet />;
   }
}