import winston, { format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

/**
 * Divider for log entries (32 equals signs)
 */
const divider: string = "=".repeat(32);

/**
 * Rotating file transport for persistent logs, which creates daily log
 * files up to 20MB, retained for 14 days
 */
const fileTransport = new DailyRotateFile({
   level: "info",
   maxSize: "20m",
   maxFiles: "14d",
   filename: "logs/%DATE%.log",
   datePattern: "YYYY-MM-DD"
});

/**
 * Console transport for immediate log visibility,
 * including colorized output for better readability
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
 * Application logger for events and errors, which logs to both console
 * and rotating files
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