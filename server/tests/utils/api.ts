import { NextFunction, Request, Response } from "express";

/**
 * Creates a mock Express Request object
 *
 * @param {Record<string, string>} cookies - Optional cookies to include in request
 * @returns {Partial<Request>} Mock request object with cookies
 */
export const createMockRequest = (cookies: Record<string, string> = {}): Partial<Request> => ({ cookies });

/**
 * Mock Response interface with test tracking capabilities
 */
export interface MockResponse extends Partial<Response> {
   statusCode?: number;
   jsonData?: any;
   status: jest.Mock;
   json: jest.Mock;
   end: jest.Mock;
   cookie: jest.Mock;
   clearCookie: jest.Mock;
   locals: Record<string, any>;
   clearCookieData: Array<{ name: string; options?: any }>;
   cookieData: Array<{ name: string; value: string; options: any }>;
}

/**
 * Mock middleware function
 */
export interface MockMiddleware extends jest.Mock {
   (req: Request, res: Response, next: NextFunction): void;
}

/**
 * Creates a mock Express Response object with tracking capabilities
 *
 * @returns {MockResponse} Mock response object
 */
export const createMockResponse = (): MockResponse => {
   const res: MockResponse = {
      locals: {},
      clearCookieData: [],
      cookieData: [],
      statusCode: undefined,
      jsonData: undefined,
      clearCookie: jest.fn((name: string, options?: any) => {
         res.clearCookieData.push({ name, options });
         return res;
      }),
      cookie: jest.fn((name: string, value: string, options: any) => {
         res.cookieData.push({ name, value, options });
         return res;
      }),
      status: jest.fn((code: number) => {
         res.statusCode = code;
         return res;
      }),
      json: jest.fn((data: any) => {
         res.jsonData = data;
         return res;
      }),
      end: jest.fn(() => res)
   };
   return res;
};

/**
 * Creates a mock Express Next function
 *
 * @returns {jest.Mock} Mock next function for middleware testing
 */
export const createMockNext = (): jest.Mock => jest.fn();

/**
 * Creates a mock Express middleware function.
 *
 * @param {Record<string, string>} cookies - Optional cookies to include in request
 * @returns {Request, res: Response, next: NextFunction } Mock middleware function with request, response, and next functions
 */
export const createMockMiddleware = (cookies: Record<string, string> = {}): { req: Request, res: Response, next: NextFunction } => ({
   req: createMockRequest(cookies) as Request,
   res: createMockResponse() as Response,
   next: createMockNext() as NextFunction
});