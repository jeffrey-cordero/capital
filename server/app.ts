require("dotenv").config();

import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import { sendError, sendSuccess } from "./controllers/api/response";
// const RedisStore = require("connect-redis").default;

import indexRouter from "./routes/index";

const app = express();
app.set("trust proxy", 1);
app.use(cookieParser());

// const Redis = require("ioredis");
// const redisClient = new Redis(process.env.REDIS_URL);

app.use(session({
   // store: new RedisStore({
   //    client:redisClient
   // }),
   secret:process.env.SESSION_SECRET,
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
app.use("/resources", express.static(path.join(__dirname, "resources")));
app.set("view engine", undefined);

app.use("/", indexRouter);

// Catch 404 and forward to error handler
app.use(function (req, res) {
   return message.sendError(res, 404, "NotFound", "The requested resource was not found");
});

// Error handler
app.use(function (error, req, res) {
   console.error(error);

   // Set locals, only providing error in development environment
   res.locals.message = error.message;
   res.locals.error = req.app.get("env") === "development" ? error : {};

   return message.sendError(res, error.status || 500, error.id || "UnknownError", error.message || "An unknown error occurred");
});

module.exports = app;