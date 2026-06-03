import './App.css'

import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import AuthMenu from './Components/AuthMenu';
import Navbar from './Components/Navbar';
import Home from '../Pages/Home.tsx';
import SavedScenes from '../Pages/SavedScenes';
import Feed from '../Pages/Feed';
import PostDetail from '../Pages/PostDetail';
import AdminPanel from '../Pages/AdminPanel';
import SceneDetail from '../Pages/SceneDetail';
import { useAuthSession } from './features/auth';
import type { AuthErrorResponse } from './features/auth';
import { initialAuthFormState, type AuthFormState, type AuthMode, type FieldErrorState } from './features/auth';

function App() {
    const { currentUser, login, register, logout } = useAuthSession();
    const [authMode, setAuthMode] = useState<AuthMode>('login');
    const [authDialogOpen, setAuthDialogOpen] = useState(false);
    const [authBusy, setAuthBusy] = useState(false);
    const [authForm, setAuthForm] = useState<AuthFormState>(initialAuthFormState);
    const [fieldErrors, setFieldErrors] = useState<FieldErrorState>({});

    useEffect(() => {
        if (!authDialogOpen) {
            return;
        }

        const onEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setAuthDialogOpen(false);
            }
        };

        window.addEventListener('keydown', onEscape);
        return () => window.removeEventListener('keydown', onEscape);
    }, [authDialogOpen]);

    const openAuthDialog = (mode: AuthMode) => {
        setAuthMode(mode);
        setFieldErrors({});
        setAuthDialogOpen(true);
    };

    const closeAuthDialog = () => {
        setAuthDialogOpen(false);
        setFieldErrors({});
        setAuthForm((current) => ({
            ...current,
            password: '',
            confirmPassword: ''
        }));
    };

    const updateField = <K extends keyof AuthFormState>(field: K, value: AuthFormState[K]) => {
        setAuthForm((current) => ({
            ...current,
            [field]: value
        }));

        setFieldErrors((current) => ({
            ...current,
            [field]: undefined,
            general: undefined
        }));
    };

    const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setAuthBusy(true);
        setFieldErrors({});

        try {
            if (authMode === 'register') {
                if (authForm.password !== authForm.confirmPassword) {
                    setFieldErrors({ confirmPassword: 'Passwords do not match.' });
                    return;
                }

                await register({
                    email: authForm.email,
                    name: authForm.name,
                    password: authForm.password,
                    confirmPassword: authForm.confirmPassword,
                    rememberMe: authForm.rememberMe
                });

                closeAuthDialog();
                return;
            }

            await login({
                email: authForm.email,
                password: authForm.password,
                rememberMe: authForm.rememberMe
            });

            closeAuthDialog();
        } catch (error) {
            const authError = error as AuthErrorResponse;
            const nextErrors: FieldErrorState = {};

            const addError = (field: keyof FieldErrorState, message: string) => {
                if (!nextErrors[field]) {
                    nextErrors[field] = message;
                }
            };

            if (authError.errors) {
                for (const [key, value] of Object.entries(authError.errors)) {
                    const messages = Array.isArray(value)
                        ? value.filter((entry): entry is string => typeof entry === 'string')
                        : typeof value === 'string'
                            ? [value]
                            : [];

                    if (!messages.length) {
                        continue;
                    }

                    const normalizedKey = key.toLowerCase();
                    if (normalizedKey === 'email') {
                        addError('email', messages[0]);
                    } else if (normalizedKey === 'name') {
                        addError('name', messages[0]);
                    } else if (normalizedKey === 'password') {
                        addError('password', messages[0]);
                    } else if (normalizedKey === 'confirmpassword') {
                        addError('confirmPassword', messages[0]);
                    } else {
                        addError('general', messages[0]);
                    }
                }
            }

            const fallbackMessage = authError.detail || authError.message || authError.title || 'Unable to complete the request.';
            nextErrors.general = nextErrors.general ?? fallbackMessage;
            setFieldErrors(nextErrors);
        } finally {
            setAuthBusy(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        setAuthForm(initialAuthFormState);
    };

    return (
        <BrowserRouter>
            <div className="app-shell">
                <Navbar
                    currentUser={currentUser}
                    onLogin={() => openAuthDialog('login')}
                    onRegister={() => openAuthDialog('register')}
                    onLogout={handleLogout}
                />
                <main className="app-content">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/feed" element={<Feed />} />
                        <Route path="/scenes" element={<SavedScenes />} />
                        <Route path="/scenes/:id" element={<SceneDetail />} />
                        <Route path="/posts/:id" element={<PostDetail />} />
                        <Route path="/admin" element={<AdminPanel />} />
                    </Routes>
                </main>
                <AuthMenu
                    open={authDialogOpen}
                    mode={authMode}
                    busy={authBusy}
                    form={authForm}
                    fieldErrors={fieldErrors}
                    onClose={closeAuthDialog}
                    onSwitchMode={setAuthMode}
                    onSubmit={handleAuthSubmit}
                    onChange={updateField}
                />
            </div>
        </BrowserRouter>
    );
}

export default App