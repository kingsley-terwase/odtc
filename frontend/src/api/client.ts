import { API_URL } from '../config';

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status = 0, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let authToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export const setAuthToken = (t: string | null) => {
  authToken = t;
};
export const getAuthToken = () => authToken;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  unauthorizedHandler = fn;
};

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** true = signed-in call (clears the session on 401). 'optional' = attach the token when there is one. */
  auth?: boolean | 'optional';
  /** Private booking token for guest booking calls. */
  guest?: string;
  timeoutMs?: number;
};

const V1 = `${API_URL}/api/v1`;

export async function call<T = any>(path: string, opts: Options = {}): Promise<T> {
  const { method = 'GET', body, auth = false, guest, timeoutMs = 60000 } = opts;

  const send = async (withAuth: boolean) => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (withAuth && authToken) headers.Authorization = `Bearer ${authToken}`;
    if (guest) headers['X-Booking-Token'] = guest;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      return await fetch(V1 + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, signal: ctl.signal });
    } catch {
      throw new ApiError('Cannot reach the server. It may be waking up, so wait a few seconds and try again.');
    } finally {
      clearTimeout(timer);
    }
  };

  let res = await send(!!auth);
  // Optional sign-in: a stale token must never block a guest action.
  if (auth === 'optional' && res.status === 401) res = await send(false);

  const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) {
    if (auth === true && res.status === 401) unauthorizedHandler?.();
    const e = (data as any).error;
    let msg = (typeof e === 'string' ? e : e?.message) || (data as any).message;
    if (!msg) {
      msg =
        res.status === 401
          ? 'Please sign in again.'
          : res.status === 429
            ? 'Too many tries. Please wait a minute and try again.'
            : 'Something went wrong. Please try again.';
    }
    throw new ApiError(msg, res.status, typeof e === 'object' ? e?.code : undefined);
  }
  return data as T;
}

/** Wakes a sleeping server (the free host spins down when idle). */
export const warmUp = () => {
  fetch(`${V1}/health`).catch(() => {});
};
