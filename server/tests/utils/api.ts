import { Request, Response } from "express";

/**
 * Mock Request/Response interfaces for unit testing purposes
 */
export interface MockRequest extends Partial<Request> {
   ip?: string;
   body?: any;
   params?: Record<string, string>;
   query?: Record<string, string>;
   headers?: Record<string, string>;
   cookies?: Record<string, string>;
}

export interface MockResponse extends Partial<Response> {
   statusCode?: number;
   jsonData?: any;
   status: jest.Mock;
   json: jest.Mock;
   end: jest.Mock;
   cookie: jest.Mock;
   clearCookie: jest.Mock;
   cookies: Record<string, { value: string; options: Record<string, any> }>;
   locals: Record<string, any>;
}

type MockRequestOptions = {
   cookies?: Record<string, string>;
   body?: any;
   params?: Record<string, string>;
   query?: Record<string, string>;
   headers?: Record<string, string>;
}

type MockMiddleware = {
   req: MockRequest,
   res: MockResponse,
   next: jest.Mock
}

/**
 * Creates a mock Express Request object
 *
 * @param {MockRequestOptions} options - Mock request options
 * @returns {MockRequest} Mock request object
 */
export const createMockRequest = (options: MockRequestOptions = {}): MockRequest => ({
   cookies: options.cookies ?? {},
   body: options.body ?? {},
   params: options.params ?? {},
   query: options.query ?? {},
   headers: options.headers ?? {}
});

/**
 * Creates a mock Express Response object with tracking capabilities
 *
 * @returns {MockResponse} Mock response object
 */
export const createMockResponse = (): MockResponse => {
   const res: MockResponse = {
      locals: {},
      cookies: {},
      statusCode: 0,
      jsonData: undefined,
      clearCookie: jest.fn((name: string, _options?: Record<string, any>) => {
         delete res.cookies[name];
         return res;
      }),
      cookie: jest.fn((name: string, value: string, options: Record<string, any>) => {
         res.cookies[name] = { value, options };
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
 * Creates a mock Express middleware function
 *
 * @param {MockRequestOptions} options - Mock request options
 * @returns {MockMiddleware} Mock middleware function with mock request, response, and next functions
 */
export const createMockMiddleware = (options: MockRequestOptions = {}): MockMiddleware => ({
   req: createMockRequest(options),
   res: createMockResponse(),
   next: jest.fn()
});