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
 * Server URL from environment variable
 */
const SERVER_URL = import.meta.env.VITE_SERVER_URL;

/**
 * Standard API response structure
 *
 * @template T Expected data type
 * @property {T} [data] - Response data payload
 * @property {Record<string, string>} [errors] - Error messages by field
 */
interface ApiResponse<T> {
   data?: T;
   errors?: Record<string, string>;
}

/**
 * Sends API request with authentication and error handling
 *
 * Automatically handles token refresh on `HTTP_STATUS.UNAUTHORIZED` responses with refreshable flag.
 * Retries the original request once after successful refresh.
 *
 * @param {string} path - API endpoint path
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {unknown} body - Request payload
 * @param {Dispatch<any>} dispatch - Redux dispatch function
 * @param {NavigateFunction} navigate - Router navigation function
 * @param {UseFormSetError<any>} [setError] - Optional form error setter
 * @param {boolean} [isRetrying=false] - Internal flag to prevent infinite refresh loops
 * @returns {Promise<T | number | null>} Response data, status code, or 0/null for server failures/errors
 */
export async function sendApiRequest<T>(
   path: string,
   method: string,
   body: unknown,
   dispatch: Dispatch<any>,
   navigate: NavigateFunction,
   setError?: UseFormSetError<any>,
   isRetrying: boolean = false
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
         // Check if token is refreshable
         const json: ApiResponse<{ refreshable?: boolean }> = await response.json();
         console.log(json, json.data);

         if (json.data?.refreshable && !isRetrying) {
            // Attempt to refresh tokens
            const refreshResponse = await fetch(`${SERVER_URL}/authentication/refresh`, {
               method: "POST",
               credentials: "include"
            });

            console.log(refreshResponse);

            if (refreshResponse.ok) {
               // Refresh successful, retry the original request once
               return sendApiRequest<T>(path, method, body, dispatch, navigate, setError, true);
            }
         }

         // Refresh failed or not refreshable, redirect to login
         window.location.pathname = "/login";
         return null;
      } else if (response.status === HTTP_STATUS.REDIRECT) {
         // Redirect to the dashboard to initialize the Redux store
         navigate("/dashboard");
         return null;
      }

      // Handle server errors (rate limiting or internal errors)
      if (response.status === HTTP_STATUS.TOO_MANY_REQUESTS || response.status === HTTP_STATUS.INTERNAL_SERVER_ERROR) {
         throw new Error((await response.json()).errors?.server || "An error occurred");
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
   } catch (error: any) {
      // Log unexpected errors
      const consoleMessage: string = error.message;
      console.error("API request failed:", consoleMessage);

      const isRatedLimited = consoleMessage.includes("Too many requests");
      const alertMessage: string = !navigator.onLine ?
         "You are offline. Check your internet connection."
         :
         isRatedLimited ?
            "Too many requests. Please try again later."
            :
            "Internal Server Error";

      // Display error notification
      dispatch(addNotification({ type: "error", message: alertMessage }));

      // Server-side failure vs. error
      return error.message === "Failed to fetch" || isRatedLimited ? 0 : null;
   }
}