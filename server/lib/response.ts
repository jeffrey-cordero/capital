import { Response } from "express";

/**
 * Sends an error response to the client with the specified code, and errors.
 *
 * @param {Response} res - Express response object
 * @param {number} code - HTTP status code
 * @param {Record<string, string>} [errors] - Optional additional error details
 */
export function sendErrors(res: Response, code: number, errors?: Record<string, string>): void {
   res.status(code).json({
      code: code,
      errors: errors || {}
   }).end();
}

/**
 * Sends a success response to the client with the specified code, and data
 * (not sent for `204` status codes).
 *
 * @param {Response} res - Express response object
 * @param {number} code - HTTP status code
 * @param {any} [data] - Optional data to include in the response
 */
export function sendSuccess(res: Response, code: number, data?: any): void {
   if (code === 204) {
      res.status(code).end();
   } else {
      res.status(code).json({
         code: code,
         data: data
      }).end();
   }
}