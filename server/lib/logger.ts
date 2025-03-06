import winston, { format, transports } from "winston";
const DailyRotateFile = require("winston-daily-rotate-file");

const divider: string = "=".repeat(32);

const fileTransport = new DailyRotateFile({
   level: "info",
   maxSize: "20m",
   maxFiles: "14d",
   filename: "logs/%DATE%.log",
   datePattern: "YYYY-MM-DD"
});

const consoleTransport = new transports.Console({
   level: "info",
   format: format.combine(
      format.colorize(),
      format.simple(),
      format.printf(({ timestamp, level, message }) => {
         return `${timestamp} (${level})\n\n${message}\n\n${divider}`;
      })
   )
});

export const logger = winston.createLogger({
   level: "info",
   format: format.combine(
      format.timestamp(),
      format.printf(({ timestamp, level, message }) => {
         return `${timestamp} (${level})\n\n${message}\n\n${divider}`;
      })
   ),
   transports: [fileTransport, consoleTransport]
});