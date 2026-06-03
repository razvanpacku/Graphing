import { createContext, useContext, useEffect, useState } from 'react';

import {
    clearAuthToken,
    fetchCurrentUser,
    getStoredAuthToken,
    loginAccount,
    logoutAccount,
    registerAccount,
    storeAuthToken,
    type AuthUser
} from './authApi';

type AuthSessionContextValue = {
    currentUser: AuthUser | null;
    accessToken: string | null;
    isRestoring: boolean;
    login: (payload: { email: string; password: string; rememberMe: boolean; }) => Promise<void>;
    register: (payload: { email: string; name: string; password: string; confirmPassword: string; rememberMe: boolean; }) => Promise<void>;
    logout: () => Promise<void>;
    clearSession: () => void;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isRestoring, setIsRestoring] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const restoreSession = async () => {
            const storedToken = getStoredAuthToken();

            if (!storedToken) {
                if (!cancelled) {
                    setAccessToken(null);
                    setCurrentUser(null);
                    setIsRestoring(false);
                }

                return;
            }

            try {
                const user = await fetchCurrentUser(storedToken);
                if (!cancelled) {
                    setAccessToken(storedToken);
                    setCurrentUser(user);
                    setIsRestoring(false);
                }
            } catch {
                clearAuthToken();
                if (!cancelled) {
                    setAccessToken(null);
                    setCurrentUser(null);
                    setIsRestoring(false);
                }
            }
        };

        void restoreSession();

        return () => {
            cancelled = true;
        };
    }, []);

    const applySession = async (token: string, rememberMe: boolean, user?: AuthUser) => {
        storeAuthToken(token, rememberMe);
        setAccessToken(token);

        if (user) {
            setCurrentUser(user);
            return;
        }

        const refreshedUser = await fetchCurrentUser(token);
        setCurrentUser(refreshedUser);
    };

    const login = async (payload: { email: string; password: string; rememberMe: boolean; }) => {
        const response = await loginAccount(payload);
        await applySession(response.accessToken, payload.rememberMe, response.user);
    };

    const register = async (payload: { email: string; name: string; password: string; confirmPassword: string; rememberMe: boolean; }) => {
        const response = await registerAccount(payload);
        await applySession(response.accessToken, payload.rememberMe, response.user);
    };

    const logout = async () => {
        if (accessToken) {
            try {
                await logoutAccount(accessToken);
            } catch {
                // Ignore logout failures; the local session is still cleared.
            }
        }

        clearAuthToken();
        setAccessToken(null);
        setCurrentUser(null);
    };

    const clearSession = () => {
        clearAuthToken();
        setAccessToken(null);
        setCurrentUser(null);
    };

    return (
        <AuthSessionContext.Provider
            value={{
                currentUser,
                accessToken,
                isRestoring,
                login,
                register,
                logout,
                clearSession
            }}
        >
            {children}
        </AuthSessionContext.Provider>
    );
}

export function useAuthSession() {
    const value = useContext(AuthSessionContext);

    if (!value) {
        throw new Error('useAuthSession must be used within an AuthSessionProvider.');
    }

    return value;
}