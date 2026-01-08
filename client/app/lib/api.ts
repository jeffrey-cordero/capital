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
 * Token management helpers for localStorage
 */
const TOKENS = {
   ACCESS: "access_token",
   REFRESH: "refresh_token"
} as const;

/**
 * Retrieves the access token from localStorage
 *
 * @returns {string | null} The stored access token or null if not found
 */
function getAccessToken(): string | null {
   return localStorage.getItem(TOKENS.ACCESS);
}

/**
 * Retrieves the refresh token from localStorage
 *
 * @returns {string | null} The stored refresh token or null if not found
 */
function getRefreshToken(): string | null {
   return localStorage.getItem(TOKENS.REFRESH);
}

/**
 * Stores both access and refresh tokens in localStorage
 *
 * @param {string} access - The new access token
 * @param {string} refresh - The new refresh token
 */
function setTokens(access: string, refresh: string): void {
   localStorage.setItem(TOKENS.ACCESS, access);
   localStorage.setItem(TOKENS.REFRESH, refresh);
}

/**
 * Removes both access and refresh tokens from localStorage
 */
function clearTokens(): void {
   localStorage.removeItem(TOKENS.ACCESS);
   localStorage.removeItem(TOKENS.REFRESH);
}

/**
 * Standard API response structure
 *
 * @template T Expected data type
 * @property {T} [data] - Response data payload
 * @property {Record<string, string>} [errors] - Error messages by field
 */
export interface ApiResponse<T> {
   data?: T;
   errors?: Record<string, string>;
}

/**
 * Sends API requests with automatic token refresh and retry logic, which may
 * redirect an authenticated user to the login page if the refresh attempt fails
 *
 * @param {string} path - API endpoint path
 * @param {string} method - HTTP method (`GET`, `POST`, `PUT`, `DELETE`)
 * @param {unknown} body - Request payload
 * @param {Dispatch<any>} dispatch - Redux dispatch function
 * @param {NavigateFunction} navigate - Router navigation function
 * @param {UseFormSetError<any>} [setError] - Optional form error setter
 * @param {boolean} [isRetrying=false] - Internal flag to prevent infinite refresh loops
 * @returns {Promise<T | number | null>} Response data, status code, or null for unexpected errors
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
      const accessToken = getAccessToken();
      const response = await fetch(`${SERVER_URL}/${path}`, {
         method,
         headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { "Authorization": `Bearer ${accessToken}` } : {})
         },
         body: body ? JSON.stringify(body) : undefined,
         credentials: "include"
      });

      // Handle potential redirection cases
      if (!isLogin && response.status === HTTP_STATUS.UNAUTHORIZED) {
         // Check if we can attempt to refresh the access token
         const json: ApiResponse<{ refreshable?: boolean }> = await response.json();

         if (json.data?.refreshable && !isRetrying) {
            const refreshToken = getRefreshToken();
            const refreshResponse = await fetch(`${SERVER_URL}/authentication/refresh`, {
               method: "POST",
               headers: {
                  ...(refreshToken ? { "Authorization": `Bearer ${refreshToken}` } : {})
               },
               credentials: "include"
            });

            if (refreshResponse.status === HTTP_STATUS.OK) {
               const refreshJson: ApiResponse<{ access_token: string; refresh_token: string }> = await refreshResponse.json();

               if (refreshJson.data?.access_token && refreshJson.data?.refresh_token) {
                  setTokens(refreshJson.data.access_token, refreshJson.data.refresh_token);
               }

               // Retry the original request once after a successful refresh attempt
               return sendApiRequest<T>(path, method, body, dispatch, navigate, setError, true);
            }
         }

         clearTokens();
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
      const json: ApiResponse<T & { access_token?: string; refresh_token?: string }> = await response.json();

      if (response.status === HTTP_STATUS.OK || response.status === HTTP_STATUS.CREATED) {
         if (json.data?.access_token && json.data?.refresh_token) {
            setTokens(json.data.access_token, json.data.refresh_token);
         } else if (path === "authentication/logout") {
            clearTokens();
         }

         return json.data as T;
      } else {
         // Error handling for form validation errors
         Object.entries(json.errors || {}).forEach(([field, message]) => {
            setError?.(field, { type: "server", message });
         });

         return null;
      }
   } catch (error: any) {
      // Log unexpected errors and display a general notification to the user
      const message: string = error.message;
      console.error(`API request failed: ${message}`);

      // Determine the notification message based on the error type
      const isRatedLimited = message.includes("Too many requests");
      const notificationMessage: string = !navigator.onLine ?
         "You are offline. Check your internet connection."
         :
         isRatedLimited ?
            "Too many requests. Please try again later."
            :
            "Internal Server Error";
      dispatch(addNotification({ type: "error", message: notificationMessage }));

      return null;
   }
}