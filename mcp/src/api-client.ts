import { config } from './config';

export class BackendError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | undefined,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'BackendError';
  }
}

export async function callBackend<T = unknown>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${config.backendUrl}${path}`;
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) init.body = JSON.stringify(body);

  const res = await fetch(url, init);
  const text = await res.text();
  const parsed: unknown = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const envelope = parsed as
      | { error?: { code?: string; message?: string; details?: unknown } }
      | null;
    const err = envelope?.error;
    throw new BackendError(
      res.status,
      err?.code,
      err?.message ?? `Backend ${method} ${path} failed: ${res.status}`,
      err?.details,
    );
  }

  return parsed as T;
}
