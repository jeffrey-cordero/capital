import { Response } from "express";

export function sendErrors(res: Response, code: number, errors: { [key: string]: string} ): void {
   res.status(code).json({
      status: "Error",
      errors: errors
   });
};

export function sendSuccess(res: Response, message: string, data?: any): void {
   res.status(200).json({
      status: "Success",
      message: message,
      data: data
   });
};