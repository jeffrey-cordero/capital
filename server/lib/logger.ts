import winston, { format, transports } from "winston";

/**
 * Divider for log entries (32 equals signs)
 */
const divider: string = "=".repeat(32);

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
 * Application console logger for events and errors
 */
export const logger = winston.createLogger({
   level: "info",
   format: format.combine(
      format.timestamp(),
      format.printf(({ timestamp, level, message }) => {
         return `${timestamp} (${level})\n\n${message}\n\n${divider}`;
      })
   ),
   transports: [consoleTransport]
});