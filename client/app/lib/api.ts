import type { Dispatch } from "@reduxjs/toolkit";
import { HTTP_STATUS } from "capital/server";
import type { UseFormSetError } from "react-hook-form";
import type { NavigateFunction } from "react-router";

import { authenticate } from "@/redux/slices/authentication";
import { addNotification } from "@/redux/slices/notifications";

// Special API paths that require different handling
const SPECIAL_PATHS = {
   LOGIN: "authentication/login",
   AUTHENTICATION: "authentication",
   DASHBOARD: "dashboard"
} as const;

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

// Type for the expected API response structure
type ApiResponse<T> = {
   data?: T;
   errors?: Record<string, string>;
};

export async function sendApiRequest<T>(
   path: string,
   method: string,
   body: unknown,
   dispatch: Dispatch<any>,
   navigate: NavigateFunction,
   setError?: UseFormSetError<any>
): Promise<T | number | null> {
   // Check if this is a special path that needs different handling
   const isLogin = path === SPECIAL_PATHS.LOGIN;
   const isAuthentication = path === SPECIAL_PATHS.AUTHENTICATION;

   try {
      const response = await fetch(`${SERVER_URL}/${path}`, {
         method,
         headers: {
            "Content-Type": "application/json"
         },
         body: body ? JSON.stringify(body) : undefined,
         credentials: "include"
      });

      // Handle authentication and redirection cases
      if (!isLogin && response.status === HTTP_STATUS.UNAUTHORIZED) {
         window.location.pathname = "/login";
         return null;
      } else if (response.status === HTTP_STATUS.REDIRECT) {
         navigate("/dashboard");
         return null;
      }

      // Handle server errors with specific error messages
      if (response.status === HTTP_STATUS.INTERNAL_SERVER_ERROR) {
         const responseData: ApiResponse<T> = await response.json();

         throw new Error(responseData.errors?.server || "An unknown error occurred");
      }

      // Update authentication state if not checking authentication
      if (!isAuthentication) {
         const isDashboard = path.startsWith(SPECIAL_PATHS.DASHBOARD);
         const isSuccessfulLogin = isLogin && response.status === HTTP_STATUS.OK;

         dispatch(authenticate(isSuccessfulLogin || isDashboard));
      }

      // Handle different response types
      if (response.status === HTTP_STATUS.NO_CONTENT) {
         return response.status;
      } else if (response.status === HTTP_STATUS.OK || response.status === HTTP_STATUS.CREATED) {
         const responseData: ApiResponse<T> = await response.json();

         return responseData.data as T;
      } else {
         // Handle validation errors from the server
         const responseData: ApiResponse<T> = await response.json();

         Object.entries(responseData.errors || {}).forEach(([field, message]) => {
            setError?.(field, { type: "server", message });
         });

         return null;
      }
   } catch (error) {
      console.error("API Request failed:", error);

      dispatch(addNotification({
         type: "error",
         message: "Internal Server Error"
      }));

      return null;
   }
}