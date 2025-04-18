import { Response } from "express";

/**
 * Sends an error response to the client
 *
 * @param {Response} res - Express response object
 * @param {number} code - HTTP status code
 * @param {Record<string, string>} [errors] - Optional error details
 */
export function sendErrors(res: Response, code: number, errors?: Record<string, string>): void {
   res.status(code).json({ code: code, errors: errors || {} }).end();
}

/**
 * Sends a success response to the client
 *
 * @param {Response} res - Express response object
 * @param {number} code - HTTP status code
 * @param {any} [data] - Optional response data
 */
export function sendSuccess(res: Response, code: number, data?: any): void {
   if (code === 204) {
      // No content required (updates, deletes, etc.) for the response
      res.status(code).end();
   } else {
      // Send the required data within the response
      res.status(code).json({ code: code, data: data }).end();
   }
}