import { createLogger, format, transports } from "winston";

const level = (process.env.LOG_LEVEL || "info").toLowerCase();
const verbose = (process.env.VERBOSE_LOGGING || "false").toLowerCase() === "true";

export const logger = createLogger({
  level,
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    verbose
      ? format.json()
      : format.printf(({ level, message, timestamp }) => `${timestamp} ${level}: ${message}`),
  ),
  transports: [new transports.Console()],
});
