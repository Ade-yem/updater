export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (err: unknown) => boolean;
}

function getRetryDelay(attempt: number, baseMs: number, maxMs: number): number {
  const exponential = Math.min(baseMs * Math.pow(2, attempt), maxMs);
  const jitter = Math.random() * 0.1 * exponential;
  return exponential + jitter;
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
    const message = err.message.toLowerCase();
    if (
      message.includes('econnrefused') ||
      message.includes('timeout') ||
      message.includes('enotfound')
    ) {
      return true;
    }
  }
  return (err as any)?.status === 429 || (err as any)?.status >= 500;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const retries = options?.retries ?? 2;
  const baseDelayMs = options?.baseDelayMs ?? 500;
  const maxDelayMs = options?.maxDelayMs ?? 5000;
  const shouldRetry = options?.shouldRetry ?? isRetryableError;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === retries || !shouldRetry(err)) {
        throw err;
      }
      const delayMs = getRetryDelay(attempt, baseDelayMs, maxDelayMs);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}
