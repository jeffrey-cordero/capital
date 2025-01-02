import { Request, Response } from "express";

export function sendError(res: Response, code: number, id: string, message: string): Response {
   return res.status(code).json({
      status: "Error",
      id: id,
      message: message
   });
};

export function sendSuccess(res: Response, message: string, data?: any): Response {
   return res.status(200).json({
      status: "Success",
      message: message,
      data: data
   });
};