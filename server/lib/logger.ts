import winston, { format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

/**
 * Divider for log file formatting (32 characters)
 */
const divider: string = "=".repeat(32);

/**
 * File transport for logging to a daily rotating file
 */
const fileTransport = new DailyRotateFile({
   level: "info",
   maxSize: "20m",
   maxFiles: "14d",
   filename: "logs/%DATE%.log",
   datePattern: "YYYY-MM-DD"
});

/**
 * Console transport for logging to the console
 */
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

/**
 * Application logger for recording events and errors
 */
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