import winston, { format, transports } from "winston";
const DailyRotateFile = require("winston-daily-rotate-file");

/**
 * Divider for log file formatting (32 characters)
 */
const divider: string = "=".repeat(32);

/**
 * File transport for logging to a rotating file
 *
 * @description
 * - Logs messages to a file with a rotating file name (logs/%DATE%.log)
 * - Formats log entries with timestamps and appropriate levels
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
 *
 * @description
 * - Logs messages to the console with colorized output
 * - Formats log entries with timestamps and appropriate levels
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
 *
 * @description
 * - Provides methods for different logging levels (debug, info, warn, error)
 * - Formats log entries with timestamps and appropriate levels
 * - Controls output based on environment configuration
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