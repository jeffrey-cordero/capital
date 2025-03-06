const DailyRotateFile = require("winston-daily-rotate-file");
import winston, { format, transports } from "winston";

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

export const logger = winston.createLogger({
   level: "info",
   format: format.combine(
      format.timestamp(),
      format.printf(({ timestamp, message }) => {
         return `   ${timestamp}   \n${message}\n${"=".repeat(32)}`;
      })
   ),
   transports: [fileTransport, consoleTransport]
});