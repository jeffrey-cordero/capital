import type { Dispatch } from "@reduxjs/toolkit";
import type { UseFormSetError } from "react-hook-form";
import type { NavigateFunction } from "react-router";

import { authenticate } from "@/redux/slices/authentication";
import { addNotification } from "@/redux/slices/notifications";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export async function sendApiRequest(
   path: string,
   method: string,
   body: any,
   dispatch: Dispatch<any>,
   navigate: NavigateFunction,
   setError?: UseFormSetError<any>
): Promise<Record<string, any> | number | null> {
   const login = window.location.pathname.includes("/login");
   const authenticating = path === "authentication";

   return await fetch(`${SERVER_URL}/${path}`, {
      method: method,
      headers: {
         "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include"
   }).then(async(response) => {
      if (response.status === 401 && !login) {
         // Unauthorized access
         dispatch(authenticate(false));
         navigate("/login");

         return null;
      } else if (response.status === 403) {
         // Navigate back to the dashboard
         navigate("/dashboard");

         return null;
      } else if (response.status === 500) {
         // Internal server errors
         throw new Error(response.statusText);
      }

      if (response.status === 201 || response.status === 204 || (response.status === 200 && login && !authenticating)) {
         // No content required on successful actions
         return response.status;
      }

      // Handle valid JSON response
      const result = await response.json();
      dispatch(authenticate(window.location.pathname.startsWith("/dashboard")));

      if (result.status === "Success") {
         // Successful response
         return result.data ?? {};
      } else {
         // Handle validation errors
         Object.entries(result.errors ?? {}).forEach(
            ([field, message]) => setError?.(field, { type: "server", message: message as string })
         );

         return null;
      }
   }).catch((error) => {
      console.error(error);

      dispatch(
         addNotification({
            type: "Error",
            message: "Internal Server Error"
         })
      );

      return null;
   });
}