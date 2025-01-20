import { Response } from "express";

export function sendErrors(res: Response, code: number, message:string, errors?: Record<string, string> ): void {
   res.status(code).json({
      status: code === 500 ? "Failure" : "Error",
      message: message,
      errors: errors || {}
   });
};

export function sendSuccess(res: Response, code: number, message: string, data?: any): void {
   res.status(code).json({
      status: "Success",
      message: message,
      data: data
   });
};