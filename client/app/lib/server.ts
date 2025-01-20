import type { Dispatch } from "@reduxjs/toolkit";

import { addNotification } from "@/redux/slices/notifications";
import type { UseFormSetError } from "react-hook-form";


export const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export async function sendApiRequest(path: string, method: string, body: any, dispatch?: Dispatch<any>, setError?: UseFormSetError<any>): Promise<{
  status: string;
  message: string;
  data: any;
  errors: Record<string, string>;
} | null> {
   return await fetch(`${SERVER_URL}/${path}`, {
      method: method,
      headers: {
         "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include"
   }).then(async(response) => {
      const data = await response.json();

      if (data.status === "Success") {
         return data;
      } else if (data.status === "Error") {
         Object.entries(data.errors).forEach(
            ([field, message]) => setError?.(field, { type: "server", message: message as string })
         );
      } else {
         throw new Error(data.errors?.system?.toString() || data.message);
      }
   }).catch((error) => {
      console.error(error.message);

      dispatch?.(
         addNotification({
            type: "error",
            message: "Internal Server Error"
         })
      );

      return null;
   });
}