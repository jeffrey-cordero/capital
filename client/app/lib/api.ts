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
): Promise<object | number | null> {
   const authenticating: boolean = path === "authentication";
   const login: boolean = window.location.pathname.includes("/login");

   return await fetch(`${SERVER_URL}/${path}`, {
      method: method,
      headers: {
         "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include"
   }).then(async(response) => {
      if (response.status === HTTP_STATUS.UNAUTHORIZED && !login) {
         // Unauthorized endpoint access
         dispatch(authenticate(false));
         navigate("/login");

         return null;
      } else if (response.status === HTTP_STATUS.REDIRECT) {
         // Navigate back to the dashboard
         navigate("/dashboard");

         return null;
      } else if (response.status === HTTP_STATUS.INTERNAL_SERVER_ERROR) {
         // Internal Server Error
         throw new Error(
            (await response.json())?.errors?.server || "An unknown error occurred"
         );
      }

      if (response.status === HTTP_STATUS.CREATED
            || response.status === HTTP_STATUS.NO_CONTENT
            || (response.status === HTTP_STATUS.OK && login && !authenticating)) {
         // No data required other than the status code for confirmation
         return response.status;
      }

      // Update the current authentication state
      if (!authenticating) {
         dispatch(authenticate(window.location.pathname.startsWith("/dashboard")));
      }

      // Handle the required JSON response for returned data or server errors
      const result = await response.json();

      if (result.code === HTTP_STATUS.OK) {
         return result.data ?? {};
      } else {
         Object.entries(result.errors ?? {}).forEach(
            ([field, message]) => setError?.(field, { type: "server", message: message as string })
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