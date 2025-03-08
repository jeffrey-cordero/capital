import type { Dispatch } from "@reduxjs/toolkit";
import type { UseFormSetError } from "react-hook-form";
import type { NavigateFunction } from "react-router";

import { authenticate } from "@/redux/slices/authentication";
import { addNotification } from "@/redux/slices/notifications";

const HTTP_STATUS = {
   OK: 200,
   CREATED: 201,
   NO_CONTENT: 204,
   REDIRECT: 302,
   UNAUTHORIZED: 401,
   INTERNAL_SERVER_ERROR: 500
};
const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export async function sendApiRequest(
   path: string,
   method: string,
   body: any,
   dispatch: Dispatch<any>,
   navigate: NavigateFunction,
   setError?: UseFormSetError<any>
): Promise<number | any | null> {
   const login: boolean = path === "authentication/login";
   const authenticating: boolean = path === "authentication";

   return await fetch(`${SERVER_URL}/${path}`, {
      method: method,
      headers: {
         "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include"
   }).then(async(response) => {
      if (!login && response.status === HTTP_STATUS.UNAUTHORIZED) {
         // Unauthorized endpoint access, which requires a global state reset
         window.location.pathname = "/login";

         return null;
      } else if (response.status === HTTP_STATUS.REDIRECT) {
         // Navigate back to the authorized endpoint
         navigate("/dashboard");

         return null;
      } else if (response.status === HTTP_STATUS.INTERNAL_SERVER_ERROR) {
         // Caught server error
         const error: string = (await response.json())?.errors?.server || "An unknown error occurred";

         throw new Error(error);
      }

      // Update the authentication state to match the server state
      if (!authenticating) {
         const dashboard: boolean = path.startsWith("dashboard");
         const loggedIn: boolean = login && response.status === HTTP_STATUS.OK;

         dispatch(authenticate(loggedIn || dashboard));
      }

      if (response.status === HTTP_STATUS.NO_CONTENT) {
         // No data required other than the status code for confirmation
         return response.status;
      } else if (response.status === HTTP_STATUS.OK || response.status === HTTP_STATUS.CREATED) {
         // Successful response
         const data: any = (await response.json())?.data ?? {};

         return data;
      } else {
         // Errors returned from the server
         const errors: Record<string, string> = (await response.json())?.errors || {};

         Object.entries(errors).forEach(
            ([field, message]) => setError?.(field, {
               type: "server", message: message as string
            })
         );

         return null;
      }
   }).catch((error: any) => {
      console.error(error);

      dispatch(
         addNotification({
            type: "error",
            message: "Internal Server Error"
         })
      );

      return null;
   });
}