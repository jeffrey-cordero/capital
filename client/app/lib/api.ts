import type { Dispatch } from "@reduxjs/toolkit";
import { HTTP_STATUS } from "capital/server";
import type { UseFormSetError } from "react-hook-form";
import type { NavigateFunction } from "react-router";

import { authenticate } from "@/redux/slices/authentication";
import { addNotification } from "@/redux/slices/notifications";

/**
 * Special API paths that require different handling
 */
const SPECIAL_PATHS = {
   USERS: "users",
   LOGIN: "authentication/login",
   AUTHENTICATION: "authentication",
   DASHBOARD: "dashboard"
} as const;

/**
 * The server URL based on the VITE_SERVER_URL environment variable
 */
const SERVER_URL = import.meta.env.VITE_SERVER_URL;

/**
 * The expected API response structure after parsing the JSON response
 */
type ApiResponse<T> = {
   data?: T;
   errors?: Record<string, string>;
};

/**
 * Sends an API request to the server.
 *
 * @param {string} path - The path to send the request to
 * @param {string} method - The method to send the request with (`GET`, `POST`, `PUT`, `DELETE`)
 * @param {unknown} body - The body to send with the request
 * @param {Dispatch<any>} dispatch - The dispatch function to dispatch actions to the Redux store
 * @param {NavigateFunction} navigate - The navigate function for potential authentication-based redirection
 * @param {UseFormSetError<any>} [setError] - The optional `setError` react-hook-form function to automate form error handling
 * @returns {Promise<T | number | null>} The response data or status code
 */
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

      // Handle potential redirection cases
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

      // Re-sync authentication state based on the response status for each request
      if (!isAuthentication) {
         const isDashboard = path.startsWith(SPECIAL_PATHS.DASHBOARD) || path === SPECIAL_PATHS.USERS;
         const isSuccessfulLogin = isLogin && response.status === HTTP_STATUS.OK;

         dispatch(authenticate(isDashboard || isSuccessfulLogin));
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

         // Error handling for form validation errors
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