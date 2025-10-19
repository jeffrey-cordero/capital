import { HTTP_STATUS } from "capital/server";
import { Response } from "express";

/**
 * Sends an error response to the client
 *
 * @param {Response} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {Record<string, string>} [errors] - Optional error details
 */
export function sendErrors(res: Response, statusCode: number, errors?: Record<string, string>): void {
   res.status(statusCode).json({ errors: errors || {} }).end();
}

/**
 * Sends a success response to the client
 *
 * @param {Response} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {any} [data] - Optional response data
 */
export function sendSuccess(res: Response, statusCode: number, data?: any): void {
   if (statusCode === HTTP_STATUS.NO_CONTENT) {
      // No content required (updates, deletes, etc.) for the response
      res.status(statusCode).end();
   } else {
      // Send the required data within the response
      res.status(statusCode).json({ data }).end();
   }
}