require("dotenv").config();

import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import indexRouter from "./routes/index";
import usersRouter from "./routes/users";
import Redis from "ioredis";
import { sendErrors } from "./controllers/api/response";
import { Request, Response } from "express";

const RedisStore = require("connect-redis").default;

const app = express();
app.set("trust proxy", 1);
app.use(cookieParser());
app.use(session({
   store: new RedisStore({
      client: new Redis(process.env.REDIS_URL || "redis:6379")
   }),
   secret: process.env.SESSION_SECRET ?? "",
   resave:false,
   saveUninitialized:true,
   cookie: { secure: process.env.NODE_ENV === "production", httpOnly: true, maxAge: 1000 * 60 * 60 }
}));
app.use(cors());
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

app.use("/", indexRouter);
app.use("/resources", express.static(path.join(__dirname, "resources")));
app.use("/users", usersRouter);


// Catch 404 and forward to error handler
app.use(function (req: Request, res: Response) {
   return sendErrors(res, 404, { system: "The requested resource could not be found" });
});

// Error handler
app.use(function (error: any, req: Request, res: Response) {
   console.error(error);

   const status: number = error.status || 500;
   const message: string = error.message || "An unknown error occurred";

   return sendErrors(res, status, { system: message });
});

export default app;