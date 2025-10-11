import "dotenv/config";

import { HTTP_STATUS } from "capital/server";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";

import { logger } from "@/lib/logger";
import { sendErrors } from "@/lib/response";
import authenticationRouter from "@/routers/authenticationRouter";
import dashboardRouter from "@/routers/dashboardRouter";
import indexRouter from "@/routers/indexRouter";
import userRouter from "@/routers/userRouter";

const app = express();
const port = process.env.PORT || 8000;

/**
 * Rate limiting with logging measures
 */
app.use(rateLimit({
   max: process.env.RATE_LIMITING_ENABLED ? 500 : Infinity,
   windowMs: 5 * 60 * 1000,
   message: "Too many requests from this IP. Please try again later.",
   handler: (req: Request, res: Response) => {
      logger.info(`Rate limited request from IP: ${req.ip}`);

      return sendErrors(res, HTTP_STATUS.TOO_MANY_REQUESTS, {
         server: "Too many requests. Please try again later."
      });
   }
}));

/**
 * Trust proxy to obtain client IP address
 */
app.set("trust proxy", 1);

/**
 * Cookie parsing middleware
 */
app.use(cookieParser());

/**
 * Compression middleware for response optimization
 */
app.use(compression());

/**
 * CORS middleware for cross-origin resource sharing configuration
 */
app.use(cors({
   origin: [process.env.CLIENT_URL || "http://localhost:3000"],
   methods: ["GET", "POST", "PUT", "DELETE"],
   allowedHeaders: ["Content-Type", "Authorization"],
   credentials: true
}));

/**
 * Disable the X-Powered-By header to hide our tech stack
 */
app.disable("x-powered-by");

/**
 * Apply all Helmet security headers (XSS attack mitigations, MIME type sniffing, referrer policy, etc.)
 */
app.use(helmet());

/**
 * Request logging for development purposes
 */
app.use(morgan("short"));

/**
 * Middleware for parsing incoming URL-encoded data and JSON payloads
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Routers for handling requests
 */
const v1 = express.Router();

v1.use("/", indexRouter);
v1.use("/users", userRouter);
v1.use("/dashboard", dashboardRouter);
v1.use("/authentication", authenticationRouter);

app.use("/api/v1", v1);

/**
 * Resource Not Found Error Handler
 */
app.use(function(req: Request, res: Response) {
   return sendErrors(res, HTTP_STATUS.NOT_FOUND, {
      server: "The requested resource could not be found"
   });
});

/**
 * Global Error Handler
 */
app.use(function(error: any, req: Request, res: Response) {
   logger.error(error.stack || "An unknown error occurred");

   return sendErrors(res, error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      server: "Internal Server Error"
   });
});

/**
 * Start the web server
 */
app.listen(port, () => {
   logger.info(`Started Capital on port ${port}`);
});

export default app;