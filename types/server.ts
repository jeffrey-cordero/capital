/**
 * Represents a server response
 */
export type ServerResponse = {
   code: number;
   data?: any;
   errors?: Record<string, string>;
};

/**
 * Represents common HTTP status codes used in the application
 */
export const HTTP_STATUS = {
   OK: 200,
   CREATED: 201,
   NO_CONTENT: 204,
   REDIRECT: 302,
   BAD_REQUEST: 400,
   UNAUTHORIZED: 401,
   FORBIDDEN: 403,
   NOT_FOUND: 404,
   CONFLICT: 409,
   INTERNAL_SERVER_ERROR: 500
} as const;