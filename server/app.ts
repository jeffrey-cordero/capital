require("dotenv").config();

import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import serveIndex from "serve-index";

import { logger } from "@/lib/logger";
import { sendErrors } from "@/lib/response";
import authenticationRouter from "@/routers/authenticationRouter";
import dashboardRouter from "@/routers/dashboardRouter";
import indexRouter from "@/routers/indexRouter";
import userRouter from "@/routers/userRouter";

export const app = express();

// Rate limiting with logging for further investigations
app.use(rateLimit({
   max: 500,
   windowMs: 10 * 60 * 1000,
   message: "Too many requests from this IP. Please try again later.",
   handler: (req: Request, res: Response) => {
      logger.info(`Rate limited request from IP: ${req.ip}`);

      return sendErrors(res, 429, "Internal Server Error",
         { server: "Too many requests. Please try again later." }
      );
   }
}));

// Trust proxy to obtain real client IP address
app.set("trust proxy", 1);

// Cookie parsing middleware
app.use(cookieParser());

// CORS
app.use(cors({
   origin: process.env.CLIENT_URL || "http://localhost:3000",
   methods: "GET,POST,PUT,DELETE",
   allowedHeaders: "Content-Type, Authorization",
   credentials: true
}));

// Content security policies
app.use(
   helmet.contentSecurityPolicy({
      directives: {
         defaultSrc: ["'self'"],
         imgSrc: ["'self'", "https://images.mktw.net", "data:"],
         scriptSrc: ["'self'", "https://cdn.jsdelivr.net"]
      }
   })
);

// Disable the X-Powered-By header for data minimization
app.disable("x-powered-by");

// Prevent potential XSS attacks via Helmet
app.use(helmet.xssFilter());

// Prevent browsers from interpreting files as a different MIME type via Helmet
app.use(helmet.noSniff());

// Request logging
app.use(morgan("short"));

// Parse incoming URL-encoded data and JSON payloads
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the resources folder
app.use("/resources", express.static(path.join(__dirname, "resources")));
app.use("/resources", serveIndex(path.join(__dirname, "resources"), { "icons": true }));

// Routers
app.use("/", indexRouter);
app.use("/users", userRouter);
app.use("/dashboard", dashboardRouter);
app.use("/authentication", authenticationRouter);

// Error Handlers
app.use(function(req: Request, res: Response) {
   return sendErrors(res, 404, "Internal Server Error",
      { server: "The requested resource could not be found" }
   );
});

app.use(function(error: any, req: Request, res: Response) {
   logger.error(error.stack || "An unknown error occurred");

   return sendErrors(res, error.status || 500, "Internal Server Error",
      { server: error.message || error.code || "An unknown error occurred" }
   );
});