/* Minimal structured logger. Never pass secrets, tokens or full request bodies. */
type Level = 'debug' | 'info' | 'warn' | 'error';

function write(level: Level, message: string, meta?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'test' && level !== 'error') return;
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...(meta ?? {}) });
  if (level === 'error' || level === 'warn') console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (m: string, meta?: Record<string, unknown>) => write('debug', m, meta),
  info: (m: string, meta?: Record<string, unknown>) => write('info', m, meta),
  warn: (m: string, meta?: Record<string, unknown>) => write('warn', m, meta),
  error: (m: string, meta?: Record<string, unknown>) => write('error', m, meta),
};

/** Truncate provider error text and strip anything that looks like a credential. */
export function safeErrorMessage(err: unknown, max = 450): string {
  const raw = err instanceof Error ? err.message : String(err);
  return raw
    .replace(/(access_token|token|password|secret|authorization)[=:]\s*\S+/gi, '$1=[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, 'Bearer [redacted]')
    .slice(0, max);
}
