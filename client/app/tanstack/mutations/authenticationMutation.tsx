import { QueryClient, useMutation } from '@tanstack/react-query';
import type { Dispatch } from '@reduxjs/toolkit';
import { authenticate } from '@/redux/slices/authentication';
import { clearAuthentication } from '@/lib/authentication';

const useAuthenticationMutation = (state: boolean, queryClient: QueryClient, dispatch: Dispatch<any>) => {
  return useMutation({
    mutationFn: state === false ? clearAuthentication : async () => {},
    onSuccess: async () => {
      // Update the authentication state
      queryClient.setQueryData(["authentication"], state);
      
      // Update Redux store
      dispatch(authenticate(state));
    },
    onError: (error) => {
      console.error(error);
    }
  });
};

export default useAuthenticationMutation;