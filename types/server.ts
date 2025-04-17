/**
 * HTTP status codes used throughout the application
 *
 * @see {@link ServerResponse} - API response structure
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

/**
 * Standard API response structure
 *
 * @see {@link HTTP_STATUS} - HTTP status codes
 */
export type ServerResponse = {
   /* HTTP status code */
   code: number;
   /* Optional data payload */
   data?: any;
   /* Optional errors payload */
   errors?: Record<string, string>;
};