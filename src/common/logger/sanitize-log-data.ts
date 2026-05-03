const REDACTED = '[REDACTED]';

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
]);

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key.toLowerCase());
}

export function sanitizeLogData<T>(value: T): T {
  return sanitizeRecursive(value, new WeakSet<object>()) as T;
}

function sanitizeRecursive(value: unknown, seen: WeakSet<object>): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeRecursive(item, seen));
  }

  if (value && typeof value === 'object') {
    const typedValue = value as Record<string, unknown>;
    if (seen.has(typedValue)) {
      return '[Circular]';
    }

    seen.add(typedValue);

    const sanitizedEntries = Object.entries(typedValue).map(([key, entryValue]) => {
      if (isSensitiveKey(key)) {
        return [key, REDACTED];
      }

      return [key, sanitizeRecursive(entryValue, seen)];
    });

    return Object.fromEntries(sanitizedEntries);
  }

  return value;
}
