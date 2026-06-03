export interface AuthUser {
    id: string;
    email: string;
    name: string;
    isBanned: boolean;
    isAdmin?: boolean;
}

export interface AuthResponse {
    accessToken: string;
    user: AuthUser;
    expiresAtUtc: string;
}

export interface AuthErrorResponse {
    message?: string;
    title?: string;
    detail?: string;
    errors?: Record<string, string[]>;
    [key: string]: unknown;
}

const authTokenCookieName = 'graphing_auth_token';

export function getStoredAuthToken(): string | null {
    if (typeof document === 'undefined') {
        return null;
    }

    const prefix = `${authTokenCookieName}=`;
    const cookieValue = document.cookie
        .split('; ')
        .find((entry) => entry.startsWith(prefix));

    if (!cookieValue) {
        return null;
    }

    return decodeURIComponent(cookieValue.slice(prefix.length));
}

export function storeAuthToken(token: string, rememberMe: boolean): void {
    const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
    const expiration = rememberMe
        ? `; Expires=${new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toUTCString()}`
        : '';

    document.cookie = `${authTokenCookieName}=${encodeURIComponent(token)}; Path=/; SameSite=Lax${expiration}${secureFlag}`;
}

export function clearAuthToken(): void {
    const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${authTokenCookieName}=; Path=/; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secureFlag}`;
}

export function createAuthHeaders(token?: string | null): HeadersInit {
    const headers: HeadersInit = {
        'Content-Type': 'application/json'
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return headers;
}

export async function registerAccount(payload: {
    email: string;
    name: string;
    password: string;
    confirmPassword: string;
    rememberMe: boolean;
}): Promise<AuthResponse> {
    return sendAuthRequest<AuthResponse>('/api/auth/register', payload);
}

export async function loginAccount(payload: {
    email: string;
    password: string;
    rememberMe: boolean;
}): Promise<AuthResponse> {
    return sendAuthRequest<AuthResponse>('/api/auth/login', payload);
}

export async function fetchCurrentUser(token: string): Promise<AuthUser> {
    return sendAuthRequest<AuthUser>('/api/auth/me', undefined, token, 'GET');
}

export async function logoutAccount(token: string): Promise<void> {
    await sendAuthRequest('/api/auth/logout', undefined, token, 'POST');
}

async function sendAuthRequest<T>(
    url: string,
    payload: unknown,
    token?: string,
    method = 'POST',
): Promise<T> {
    const response = await fetch(url, {
        method,
        headers: createAuthHeaders(token),
        body: method === 'GET' ? undefined : JSON.stringify(payload)
    });

    if (!response.ok) {
        throw await readAuthError(response);
    }

    return response.json() as Promise<T>;
}

async function readAuthError(response: Response): Promise<AuthErrorResponse> {
    const parsed = await response.json().catch(() => null);

    if (parsed && typeof parsed === 'object') {
        return parsed as AuthErrorResponse;
    }

    return {
        title: response.statusText,
        detail: 'The request could not be completed.'
    };
}