import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { Outlet, useNavigate } from "react-router";

import Loading from "@/components/global/loading";
import { fetchAuthentication } from "@/tanstack/queries/authentication";

export default function Layout() {
   // Potentially redirect logged in users to the dashboard
   const dispatch = useDispatch(), navigate = useNavigate();
   const { data, isLoading } = useQuery({
      queryKey: ["authentication"],
      queryFn: () => fetchAuthentication(dispatch, navigate)
   });

   if (isLoading || data === null) {
      return <Loading />;
   } else {
      return <Outlet />;
   }
}