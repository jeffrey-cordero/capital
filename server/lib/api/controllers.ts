import { ServerResponse } from "capital/server";
import { Response } from "express";

import { sendErrors, sendSuccess } from "@/lib/api/response";

// Shared controller logic for sending service requests, handling responses, and internal errors
export async function submitServiceRequest(serviceMethod: () => Promise<ServerResponse>, res: Response) {
   try {
      // Submit service request and handle potential response
      const result: ServerResponse = await serviceMethod();

      if (result.status === 200 || result.status === 201 || result.status === 204) {
         // Successful request with data or no content
         return sendSuccess(res, result.status, result.message, result.data ?? undefined);
      } else {
         // Validation errors and/or conflicts
         return sendErrors(res, result.status, result.message, result.errors);
      }
   } catch (error: any) {
      // Internal server error handling
      console.error(error);

      return sendErrors(res, 500, "Internal Server Error", { System: error.message });
   }
}