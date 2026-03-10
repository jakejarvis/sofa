import pino from "pino";

const VALID_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace"];

const envLevel = process.env.LOG_LEVEL?.toLowerCase() ?? "info";
const level = VALID_LEVELS.includes(envLevel) ? envLevel : "info";

const isDev = process.env.NODE_ENV !== "production";

export const rootLogger = pino({
  level,
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:HH:MM:ss.l",
        ignore: "pid,hostname",
        messageFormat: "[{module}] {msg}",
      },
    },
  }),
});

export interface Logger {
  error(msg: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  info(msg: string, ...args: unknown[]): void;
  debug(msg: string, ...args: unknown[]): void;
}

function wrapLevel(
  child: pino.Logger,
  lvl: "error" | "warn" | "info" | "debug",
) {
  return (msg: string, ...args: unknown[]) => {
    if (args.length === 0) {
      child[lvl](msg);
    } else if (args.length === 1 && args[0] instanceof Error) {
      child[lvl]({ err: args[0] }, msg);
    } else if (
      args.length === 1 &&
      typeof args[0] === "object" &&
      args[0] !== null &&
      !Array.isArray(args[0])
    ) {
      child[lvl](args[0] as object, msg);
    } else {
      child[lvl]({ extra: args }, msg);
    }
  };
}

export function createLogger(name: string): Logger {
  const child = rootLogger.child({ module: name });
  return {
    error: wrapLevel(child, "error"),
    warn: wrapLevel(child, "warn"),
    info: wrapLevel(child, "info"),
    debug: wrapLevel(child, "debug"),
  };
}
