import { Response } from "express";

export function sendErrors(res: Response, status: number, message: string, errors?: Record<string, string>): void {
   // Return error message to client with potential respective errors
   res.status(status).json({
      status: status === 500 ? "Failure" : "Error",
      message: message,
      errors: errors || {}
   }).end();
}

export function sendSuccess(res: Response, status: number, message: string, data?: any): void {
   if (status === 201 || status === 204) {
      // No content required for client
      res.status(status).end();
   } else {
      // Send data to client
      res.status(status).json({
         status: "Success",
         message: message,
         data: data
      }).end();
   }
}