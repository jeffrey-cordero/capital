import { Response } from "express";

/**
 * Sends an error response to the client
 *
 * @param {Response} res - Express response object
 * @param {number} code - HTTP status code
 * @param {string} [message] - Error message
 * @param {Record<string, string>} [errors] - Optional additional error details
 * @see {@link ServerResponse}
 * @description
 * - Sends an error response to the client with the specified code, message, and errors
 */
export function sendErrors(res: Response, code: number, message?: string, errors?: Record<string, string>): void {
   res.status(code).json({
      code: code,
      message: message,
      errors: errors || {}
   }).end();
}

/**
 * Sends a success response to the client
 *
 * @param {Response} res - Express response object
 * @param {number} code - HTTP status code
 * @param {string} [message] - Optional success message
 * @param {any} [data] - Optional data to include in the response
 * @see {@link ServerResponse}
 * @description
 * - Sends a success response to the client with the specified code, message, and data
 * - If the code is 204, no content is sent to the client
 */
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