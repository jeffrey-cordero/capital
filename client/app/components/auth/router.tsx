import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Outlet, useNavigate } from "react-router-dom";

import Loading from "@/components/global/loading";
import { fetchAuthentication } from "@/lib/auth";
import { authenticate } from "@/redux/slices/auth";
import type { RootState } from "@/redux/store";

// Helper component to handle authentication-related redirection for landing/ home layouts
export default function Router({ home }: { home: boolean }) {
   const { data, isLoading, error, isError } = useQuery({ 
      queryKey: ["auth"], 
      queryFn: fetchAuthentication,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000
   });

   const authenticated: boolean = useSelector((state: RootState) => state.auth.value);
   const redirection: boolean = home && !authenticated || !home && authenticated;
   const navigate = useNavigate();
   const dispatch = useDispatch();

   useEffect(() => {
      if (isLoading) return;

      if (isError) {
         // Internal server error
         console.error(error);

         dispatch(authenticate(false));
      } else if (!data) {
         // Unauthenticated
         dispatch(authenticate(false));
      } else {
         // Authenticated
         dispatch(authenticate(data));
      }
   }, [dispatch, data, isError, isLoading]);

   useEffect(() => {
      if (redirection) {
         navigate(home ? "/login" : "/home");
      }
   }, [redirection]);

   if (isLoading || redirection) {
      return <Loading />;
   } else {
      return <Outlet />;
   }
}