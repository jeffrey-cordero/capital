import type { Dispatch } from "@reduxjs/toolkit";
import type { NavigateFunction } from "react-router";

import { sendApiRequest } from "@/lib/api";
import { authenticate } from "@/redux/slices/authentication";

export async function clearAuthentication(dispatch: Dispatch<any>, navigate: NavigateFunction): Promise<void> {
   if (await sendApiRequest("authentication/logout", "POST", null, dispatch, navigate) !== null) {
      dispatch(authenticate(false));
   }
};