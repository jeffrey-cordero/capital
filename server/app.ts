require("dotenv").config();

import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import session from "express-session";
import helmet from "helmet";
import Redis from "ioredis";
import path from "path";
import serveIndex from "serve-index";
import winston, { format, transports } from "winston";

import { sendErrors } from "@/lib/response";
import authenticationRouter from "@/routers/authenticationRouter";
import dashboardRouter from "@/routers/dashboardRouter";
import indexRouter from "@/routers/indexRouter";
import userRouter from "@/routers/userRouter";

const app = express();
const redisStore = require("connect-redis").default;
const requests = require("morgan");
const DailyRotateFile = require("winston-daily-rotate-file");
const redisClient = new Redis(process.env.REDIS_URL || "redis:6379");

// Session management through Redis store
app.use(session({
   store: new redisStore({
      client: redisClient
   }),
   resave: false,
   saveUninitialized: true,
   secret: process.env.SESSION_SECRET || "",
   cookie: {
      httpOnly: true,
      sameSite: "strict",
      maxAge: 1000 * 60 * 60 * 24,
      secure: process.env.NODE_ENV === "production"
   }
}));

// Rate limiting
app.use(rateLimit({
   max: 250,
   windowMs: 15 * 60 * 1000,
   message: "Too many requests from this IP. Please try again later."
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

// Development mode request logging
app.use(requests("dev"));

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
      { System: "The requested resource could not be found" }
   );
});

app.use(function(error: any, req: Request, res: Response) {
   logger.error(error);
   const status: number = error.status || 500;
   const message: string = error.message || "An unknown error occurred";

   return sendErrors(res, status, "Internal Server Error", { System: message });
});

// Logging
const fileTransport = new DailyRotateFile({
   level: "error",
   maxSize: "20m",
   maxFiles: "14d",
   filename: "logs/%DATE%.log",
   datePattern: "YYYY-MM-DD"
});

const consoleTransport = new transports.Console({
   level: "error",
   format: format.combine(
      format.colorize(),
      format.simple(),
      format.printf(({ timestamp, message }) => {
         return `   ${timestamp}   \n\n$${message}\n\n${"=".repeat(32)}`;
      })
   )
});

const logger = winston.createLogger({
   level: "error",
   format: format.combine(
      format.timestamp(),
      format.printf(({ timestamp, message }) => {
         return `   ${timestamp}   \n\n${message}\n\n${"=".repeat(32)}`;
      })
   ),
   transports: [fileTransport, consoleTransport]
});

export { app, logger, redisClient };