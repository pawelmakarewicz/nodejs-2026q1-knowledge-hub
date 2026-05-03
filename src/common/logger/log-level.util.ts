export const SUPPORTED_LOG_LEVELS = [
  'log',
  'error',
  'warn',
  'debug',
  'verbose',
] as const;

export type AppLogLevel = (typeof SUPPORTED_LOG_LEVELS)[number];

const LOG_LEVEL_PRIORITY: Record<AppLogLevel, number> = {
  error: 0,
  warn: 1,
  log: 2,
  debug: 3,
  verbose: 4,
};

export function resolveLogLevel(value = process.env.LOG_LEVEL): AppLogLevel {
  if (!value) {
    return 'log';
  }

  const normalized = value.toLowerCase();
  if ((SUPPORTED_LOG_LEVELS as readonly string[]).includes(normalized)) {
    return normalized as AppLogLevel;
  }

  return 'log';
}

export function shouldLog(
  targetLevel: AppLogLevel,
  configuredLevel: AppLogLevel,
): boolean {
  return LOG_LEVEL_PRIORITY[targetLevel] <= LOG_LEVEL_PRIORITY[configuredLevel];
}
