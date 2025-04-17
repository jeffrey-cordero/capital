/**
 * Common HTTP status codes used throughout the application,
 * defined as constants to ensure consistency and reduce potential errors.
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
 * Represents standard API response structure with status code and optional data/errors, which
 * provides a consistent interface for all server responses with appropriate status codes and
 * payload containers.
 *
 * @see {@link HTTP_STATUS} - The HTTP status codes used throughout the application.
 */
export type ServerResponse = {
   /** HTTP status code */
   code: number;
   /** Optional data payload */
   data?: any;
   /** Optional error details */
   errors?: Record<string, string>;
};