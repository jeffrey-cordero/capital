import { Response } from "express";

export function sendErrors(res: Response, status: number, message: string, errors?: Record<string, string>): void {
   res.status(status).json({
      status: status === 500 ? "Failure" : "Error",
      message: message,
      errors: errors || {}
   });
}

export function sendSuccess(res: Response, status: number, message: string, data?: any): void {
   res.status(status).json({
      status: "Success",
      message: message,
      data: data
   });
}