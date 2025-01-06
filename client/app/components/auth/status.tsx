import Loading from '@/components/global/loading';
import { validateToken } from '@/query/auth';
import { authenticate } from '@/redux/slices/auth';
import type { RootState } from '@/redux/store';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Outlet, useNavigate } from 'react-router-dom';

interface AuthProps {
   home: boolean;
}

export default function Auth(props: AuthProps) {
   const { home } = props;
   const { data, isLoading, error, isError } = useQuery({ queryKey: ["auth"], queryFn: validateToken });
   const isAuthenticated = useSelector((state: RootState) => state.auth.value);
   const requiresRedirection: boolean = home && !isAuthenticated || !home && isAuthenticated;
   const dispatch = useDispatch();
   const navigate = useNavigate();

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

         requiresRedirection && navigate(home ? '/login' : '/home');
      } else {
         // Authenticated
         dispatch(authenticate(data));
      }
   }, [dispatch, data, isError, isLoading]);


   if (isLoading) {
      return <Loading />;
   } else if (!requiresRedirection) {
      return <Outlet />;
   } else {
      return null;
   }
}