/**
 * Mock utilities for Express API testing
 *
 * Provides factory functions for creating mock Express Request, Response, and Next objects
 * Used across server unit tests for consistent test setup
 */

import { Request, Response } from "express";

/**
 * Creates a mock Express Request object
 *
 * @param {Record<string, string>} cookies - Optional cookies to include in request
 * @returns {Partial<Request>} Mock request object with cookies
 */
export const createMockRequest = (cookies: Record<string, string> = {}): Partial<Request> => ({
   cookies
});

/**
 * Mock Response interface with test tracking capabilities
 */
export interface MockResponse extends Partial<Response> {
   locals: Record<string, any>;
   clearCookieData: Array<{ name: string; options?: any }>;
   cookieData: Array<{ name: string; value: string; options: any }>;
   statusCode?: number;
   jsonData?: any;
   clearCookie: jest.Mock;
   cookie: jest.Mock;
   status: jest.Mock;
   json: jest.Mock;
   end: jest.Mock;
}

/**
 * Creates a mock Express Response object with tracking capabilities
 *
 * Tracks all cookie operations, status codes, and JSON responses for testing.
 * All methods return the mock response object to support chaining.
 *
 * @returns {MockResponse} Mock response object with test helpers
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