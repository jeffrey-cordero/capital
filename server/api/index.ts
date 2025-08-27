require("dotenv").config();
require("module-alias/register");

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
   max: 500,
   windowMs: 5 * 60 * 1000,
   message: "Too many requests from this IP. Please try again later.",
   handler: (req: Request, res: Response) => {
      logger.info(`Rate limited request from IP: ${req.ip}`);

      return sendErrors(res, 429, {
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
app.use("/", indexRouter);
app.use("/users", userRouter);
app.use("/dashboard", dashboardRouter);
app.use("/authentication", authenticationRouter);

/**
 * 404 error handler
 */
app.use(function(req: Request, res: Response) {
   return sendErrors(res, 404, {
      server: "The requested resource could not be found"
   });
});

/**
 * 500 error handler
 */
app.use(function(error: any, req: Request, res: Response) {
   logger.error(error.stack || "An unknown error occurred");

   return sendErrors(res, error.status || 500, {
      server: "Internal Server Error"
   });
});

/**
 * Start the web server
 */
app.listen(port);

module.exports = app;