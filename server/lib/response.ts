import { Response } from "express";

export function sendErrors(res: Response, code: number, message?: string, errors?: Record<string, string>): void {
   // Return error message to the client with respective errors, if any
   res.status(code).json({
      code: code,
      message: message,
      errors: errors || {}
   }).end();
}

export function sendSuccess(res: Response, code: number, message?: string, data?: any): void {
   if (code === 204) {
      // No content required for the client
      res.status(code).end();
   } else {
      // Send the required content to client
      res.status(code).json({
         code: code,
         message: message,
         data: data
      }).end();
   }
}