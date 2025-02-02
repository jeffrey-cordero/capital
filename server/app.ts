require("dotenv").config();

import express from "express";
import cron from "node-cron";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import cors from "cors";
import Redis from "ioredis";
import helmet from "helmet";
import serveIndex from 'serve-index';
import indexRouter from "@/routers/indexRouter";
import authRouter from "@/routers/authRouter";
import usersRouter from "@/routers/usersRouter";
import homeRouter from "@/routers/homeRouter";
import { session } from "@/session";
import { sendErrors } from "@/lib/api/response";
import { Request, Response } from "express";
import { StocksModel } from "@/models/stocksModel";

const app = express();
const redisStore = require("connect-redis").default;
const redisClient = new Redis(process.env.REDIS_URL || "redis:6379");

app.set("trust proxy", 1);
app.use(cookieParser());
app.use(session({
   store: new redisStore({
      client: redisClient
   }),
   secret: process.env.SESSION_SECRET || "",
   resave:false,
   saveUninitialized:true,
   cookie: {
      httpOnly: true,
      sameSite: false,
      maxAge: 1000 * 60 * 60,
      secure: process.env.NODE_ENV === "production"
  },
}));
app.use(cors({
   origin: process.env.CLIENT_URL || "http://localhost:3000",
   credentials: true
}));
app.use(
   helmet.contentSecurityPolicy({
      directives: {
         defaultSrc: ["'self'"],
         imgSrc: ["'self'", "https://images.mktw.net", "data:"],
         scriptSrc: ["'self'", "https://cdn.jsdelivr.net"]
      }
   })
);
app.use(logger("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/resources", express.static(path.join(__dirname, "resources")));
app.use('/resources', serveIndex(path.join(__dirname, 'resources'), {'icons': true}));

app.use("/", indexRouter);
app.use("/auth", authRouter);
app.use("/home", homeRouter);
app.use("/users", usersRouter);

// Initialize Redis cache with financial data, if applicable
const initializeRedisCache = async () => {
   await StocksModel.fetchStocks() === null && await StocksModel.updateStocks();
}

initializeRedisCache();

// Catch 404 and forward to error handler
app.use(function (req: Request, res: Response) {
   return sendErrors(res, 404, "Internal server error", { system: "The requested resource could not be found" });
});

// Error handler
app.use(function (error: any, req: Request, res: Response) {
   console.error(error);

   const status: number = error.status || 500;
   const message: string = error.message || "An unknown error occurred";

   return sendErrors(res, status, "Internal server error", { system: message });
});

export { app, redisClient };