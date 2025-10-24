import { Request, Response } from "express";

/**
 * Mock Request/Response/NextFunction interfaces for unit testing purposes
 */
export interface MockRequest extends Partial<Request> {
   ip?: string;
   body?: any;
   params?: Record<string, string>;
   query?: Record<string, string>;
   locals?: Record<string, any>;
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

export interface MockNextFunction extends jest.Mock {
   (_error?: Error): void;
}

type MockRequestOptions = {
   cookies?: Record<string, string>;
   body?: any;
   params?: Record<string, string>;
   query?: Record<string, string>;
   locals?: Record<string, any>;
   headers?: Record<string, string>;
}

type MockMiddleware = {
   mockReq: jest.Mocked<MockRequest>,
   mockRes: MockResponse,
   mockNext: MockNextFunction
}

/**
 * Creates a mock Express Request object
 *
 * @param {MockRequestOptions} options - Mock request options
 * @returns {MockRequest} Mock request object
 */
const createMockRequest = (options: MockRequestOptions = {}): MockRequest => ({
   cookies: options.cookies ?? {},
   body: options.body ?? {},
   params: options.params ?? {},
   query: options.query ?? {},
   headers: options.headers ?? {},
   locals: options.locals ?? {}
});

/**
 * Creates a mock Express Response object with tracking capabilities
 *
 * @returns {MockResponse} Mock response object
 */
const createMockResponse = (): MockResponse => {
   const mockRes: MockResponse = {
      locals: {},
      cookies: {},
      statusCode: 0,
      jsonData: undefined,
      clearCookie: jest.fn((name: string, _options?: Record<string, any>) => {
         delete mockRes.cookies[name];
         return mockRes;
      }),
      cookie: jest.fn((name: string, value: string, options: Record<string, any>) => {
         mockRes.cookies[name] = { value, options };
         return mockRes;
      }),
      status: jest.fn((statusCode: number) => {
         mockRes.statusCode = statusCode;
         return mockRes;
      }),
      json: jest.fn((data: any) => {
         mockRes.jsonData = data;
         return mockRes;
      }),
      end: jest.fn(() => mockRes)
   };

   return mockRes;
};

/**
 * Creates a mock Express middleware function
 *
 * @param {MockRequestOptions} options - Mock request options
 * @returns {MockMiddleware} Mock middleware function with mock request, response, and next functions
 */
export function createMockMiddleware(options: MockRequestOptions = {}): MockMiddleware {
   return {
      mockReq: createMockRequest(options),
      mockRes: createMockResponse(),
      mockNext: jest.fn() as MockNextFunction
   };
}