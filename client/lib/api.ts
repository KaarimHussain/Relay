const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('relay_token');
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    const message =
      Array.isArray(body.message) ? body.message[0] : (body.message ?? 'Something went wrong');
    return new ApiError(res.status, body.error ?? 'UNKNOWN', message);
  } catch {
    return new ApiError(res.status, 'UNKNOWN', res.statusText || 'Something went wrong');
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T> {
  // Let the browser set Content-Type (with boundary) for FormData bodies
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  if (authenticated) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && authenticated) {
    // Token expired or invalid — clear session and redirect to login
    if (typeof window !== 'undefined') {
      localStorage.removeItem('relay_token');
      document.cookie = 'relay_token=; Max-Age=0; path=/';
      window.location.replace('/login');
    }
    throw new ApiError(401, 'UNAUTHORIZED', 'Session expired. Please sign in again.');
  }

  if (!res.ok) throw await parseError(res);

  // A few valid API operations intentionally have no response body. Treat every
  // successful empty response consistently, not only an explicit 204 status.
  if (res.status === 204) return undefined as T;
  const body = await res.text();
  return (body ? JSON.parse(body) : undefined) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown, authenticated = true) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }, authenticated),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'DELETE', ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }),
  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: 'POST', body: formData }),
};
