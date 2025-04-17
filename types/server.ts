/**
 * Represents the HTTP status codes used throughout the application.
 *
 * @see {@link ServerResponse} - The type for API response structure.
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
 * Represents the standard API response structure with status code and optional data/errors.
 *
 * @see {@link HTTP_STATUS} - The HTTP status codes used throughout the application.
 */
export type ServerResponse = {
   /* HTTP status code */
   code: number;
   /* Optional data payload */
   data?: any;
   /* Optional errors payload */
   errors?: Record<string, string>;
};