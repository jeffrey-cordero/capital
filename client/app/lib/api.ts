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
 * Represents the expected API response structure.
 *
 * @template T The expected type of the `data` field.
 * @interface
 * @property {T} [data] - Optional data returned from the API.
 * @property {Object<string, string>} [errors] - Optional map of error messages.
 */
interface ApiResponse<T> {
   data?: T;
   errors?: Record<string, string>;
}

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
   const isLogin = path === SPECIAL_PATHS.LOGIN;
   const isAuthenticating = path === SPECIAL_PATHS.AUTHENTICATION;
   const isUpdatingUserInformation = path === SPECIAL_PATHS.USERS && method !== "POST";

   try {
      const response = await fetch(`${SERVER_URL}/${path}`, {
         method,
         headers: { "Content-Type": "application/json" },
         body: body ? JSON.stringify(body) : undefined,
         credentials: "include"
      });

      // Handle potential redirection cases
      if (!isLogin && response.status === HTTP_STATUS.UNAUTHORIZED) {
         // Update pathname to ensure Redux store is cleared
         window.location.pathname = "/login";
         return null;
      } else if (response.status === HTTP_STATUS.REDIRECT) {
         // Redirect to the dashboard to initialize the Redux store
         navigate("/dashboard");
         return null;
      }

      // Handle Internal Server Errors
      if (response.status === HTTP_STATUS.INTERNAL_SERVER_ERROR) {
         throw new Error((await response.json()).errors?.server || "An unknown error occurred");
      }

      // Re-sync authentication state
      if (!isAuthenticating) {
         const isDashboard = path.startsWith(SPECIAL_PATHS.DASHBOARD);
         const isSuccessfulLogin = isLogin && response.status === HTTP_STATUS.OK;

         dispatch(authenticate(isDashboard || isUpdatingUserInformation || isSuccessfulLogin));
      }

      // Handle no content responses
      if (response.status === HTTP_STATUS.NO_CONTENT) {
         return response.status;
      }

      // Handle successful or error responses
      const json: ApiResponse<T> = await response.json();

      if (response.status === HTTP_STATUS.OK || response.status === HTTP_STATUS.CREATED) {
         return json.data as T;
      } else {
         // Error handling for form validation errors
         Object.entries(json.errors || {}).forEach(([field, message]) => {
            setError?.(field, { type: "server", message });
         });

         return null;
      }
   } catch (error) {
      // Log unexpected errors
      console.error("API Request failed:", error);

      // Display error notification
      dispatch(addNotification({
         type: "error",
         message: "Internal Server Error"
      }));

      return null;
   }
}