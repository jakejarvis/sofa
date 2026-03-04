const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 } as const;
type Level = keyof typeof LEVELS;

const currentLevel: Level =
  (process.env.LOG_LEVEL as Level) in LEVELS
    ? (process.env.LOG_LEVEL as Level)
    : "info";

export function createLogger(prefix: string) {
  const fmt = (msg: string) => `[${prefix}] ${msg}`;
  return {
    error(msg: string, ...args: unknown[]) {
      if (LEVELS[currentLevel] >= LEVELS.error)
        console.error(fmt(msg), ...args);
    },
    warn(msg: string, ...args: unknown[]) {
      if (LEVELS[currentLevel] >= LEVELS.warn) console.warn(fmt(msg), ...args);
    },
    info(msg: string, ...args: unknown[]) {
      if (LEVELS[currentLevel] >= LEVELS.info) console.log(fmt(msg), ...args);
    },
    debug(msg: string, ...args: unknown[]) {
      if (LEVELS[currentLevel] >= LEVELS.debug)
        console.debug(fmt(msg), ...args);
    },
  };
}
