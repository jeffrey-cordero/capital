import type { Dispatch } from "@reduxjs/toolkit";
import { QueryClient, useMutation } from "@tanstack/react-query";

import { clearAuthentication } from "@/lib/authentication";
import { authenticate } from "@/redux/slices/authentication";

const useAuthenticationMutation = (state: boolean, queryClient: QueryClient, dispatch: Dispatch<any>) => {
   return useMutation({
      // Assumes successful login/registration or intent to logout
      mutationFn: state === false ? clearAuthentication : async() => {},
      onSuccess: async() => {
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