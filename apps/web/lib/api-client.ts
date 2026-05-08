/**
 * Lightweight fetch wrapper. Auth token attached automatically when present.
 * Use server-side `serverFetch` in RSC; client-side `apiFetch` from interactive code.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(public status: number, public body: unknown) {
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

export async function apiFetch<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { token, query, headers, ...rest } = opts;
  const res = await fetch(buildUrl(path, query), {
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
  const res = await fetch(buildUrl(path, query), {
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
