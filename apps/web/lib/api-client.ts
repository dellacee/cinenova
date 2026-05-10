/**
 * Lightweight fetch wrapper. Auth token attached automatically when present.
 * Use server-side `serverFetch` in RSC; client-side `apiFetch` from interactive code.
 */

// Use || (not ??) so empty-string values from misconfigured env vars also
// fall through to the default. Vercel "Sensitive" env vars get exposed as
// '' at build time, which would otherwise produce an invalid URL and crash
// the /_not-found page collector.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
const TIMEOUT_MS = 10_000;

if (
  typeof window === 'undefined' &&
  process.env.NODE_ENV === 'production' &&
  API_BASE.includes('localhost')
) {
  // Render server-side will hang trying to reach localhost. Surface this loudly
  // so it shows up in Vercel function logs rather than silently 30s-timing out.
  // eslint-disable-next-line no-console
  console.warn(
    '[api-client] NEXT_PUBLIC_API_BASE_URL is missing — falling back to localhost. ' +
      'Set it in Vercel project env vars.',
  );
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API ${status}`);
    this.name = 'ApiError';
  }
}

interface ApiOptions extends RequestInit {
  token?: string | null;
  query?: Record<string, string | number | boolean | undefined>;
}

function buildUrl(path: string, query?: ApiOptions['query']): string {
  const url = new URL(path.replace(/^\//, ''), `${API_BASE.replace(/\/$/, '')}/api/`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v != null) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function apiFetch<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { token, query, headers, ...rest } = opts;
  const res = await fetchWithTimeout(buildUrl(path, query), {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    throw new ApiError(res.status, body);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function serverFetch<T>(
  path: string,
  opts: ApiOptions & { revalidate?: number | false } = {},
): Promise<T> {
  const { token, query, headers, revalidate, ...rest } = opts;
  const res = await fetchWithTimeout(buildUrl(path, query), {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    next: { revalidate: revalidate === false ? undefined : (revalidate ?? 30) },
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return (await res.json()) as T;
}
