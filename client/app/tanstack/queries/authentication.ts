import type { Dispatch } from "@reduxjs/toolkit";
import type { NavigateFunction } from "react-router";

import { sendApiRequest } from "@/lib/api";
import { authenticate } from "@/redux/slices/authentication";

export async function fetchAuthentication(dispatch: Dispatch<any>, navigate: NavigateFunction): Promise<boolean | null> {
   const confirmation = await sendApiRequest("authentication", "GET", null, dispatch, navigate) as { authenticated: boolean };

   if (confirmation !== null) {
      dispatch(authenticate(confirmation.authenticated));
   }

   return confirmation.authenticated === true ? null : false;
};

export async function clearAuthentication(dispatch: Dispatch<any>, navigate: NavigateFunction): Promise<void> {
   const logout = await sendApiRequest("authentication/logout", "POST", null, dispatch, navigate);

   if (logout !== null) {
      dispatch(authenticate(false));
   }
};