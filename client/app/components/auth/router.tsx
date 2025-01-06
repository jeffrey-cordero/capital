import Loading from '@/components/global/loading';
import { fetchAuthentication } from '@/query/auth';
import { authenticate } from '@/redux/slices/auth';
import type { RootState } from '@/redux/store';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Outlet, useNavigate } from 'react-router-dom';

export default function Router({ home }: { home: boolean }) {
   // Helper component to handle authentication-related redirection for landing/ home layouts
   const { data, isLoading, error, isError } = useQuery({ queryKey: ["auth"], queryFn: fetchAuthentication });
   const navigate = useNavigate();
   const dispatch = useDispatch();
   const authenticated: boolean = useSelector((state: RootState) => state.auth.value);
   const redirection: boolean = home && !authenticated || !home && authenticated;

   useEffect(() => {
      // If the query is still loading, do nothing
      if (isLoading) return;

      if (isError) {
         // Internal server error
         console.error(error);

         dispatch(authenticate(false));
      } else if (!data) {
         // Unauthenticated
         dispatch(authenticate(false));

         redirection && navigate(home ? '/login' : '/home');
      } else {
         // Authenticated
         dispatch(authenticate(data));
         redirection && navigate(home ? '/home' : '/login');
      }
   }, [dispatch, data, isError, isLoading]);

   useEffect(() => {
      redirection && navigate(home ? '/login' : '/home');
   }, [redirection]);

   if (isLoading) {
      return <Loading />;
   } else if (!redirection) {
      return <Outlet />;
   } else {
      return null;
   }
}