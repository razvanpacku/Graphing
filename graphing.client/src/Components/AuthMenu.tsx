import type { FormEvent } from 'react';

import type { AuthFormState, AuthMode, FieldErrorState } from '../features/auth/authTypes';

export interface AuthMenuProps {
    open: boolean;
    mode: AuthMode;
    busy: boolean;
    form: AuthFormState;
    fieldErrors: FieldErrorState;
    onClose: () => void;
    onSwitchMode: (mode: AuthMode) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onChange: <K extends keyof AuthFormState>(field: K, value: AuthFormState[K]) => void;
}

function AuthMenu({
    open,
    mode,
    busy,
    form,
    fieldErrors,
    onClose,
    onSwitchMode,
    onSubmit,
    onChange
}: AuthMenuProps) {
    if (!open) {
        return null;
    }

    return (
        <div className="auth-backdrop" role="presentation" onMouseDown={onClose}>
            <section
                className="auth-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="auth-dialog-title"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="auth-dialog-header">
                    <div>
                        <p className="auth-kicker">Account access</p>
                        <h2 id="auth-dialog-title">{mode === 'login' ? 'Log in' : 'Create account'}</h2>
                    </div>
                    <button className="icon-button" type="button" onClick={onClose} aria-label="Close auth dialog">
                        ×
                    </button>
                </div>

                <div className="auth-mode-switch" role="tablist" aria-label="Authentication mode">
                    <button
                        type="button"
                        className={mode === 'login' ? 'auth-mode-tab active' : 'auth-mode-tab'}
                        onClick={() => onSwitchMode('login')}
                    >
                        Log in
                    </button>
                    <button
                        type="button"
                        className={mode === 'register' ? 'auth-mode-tab active' : 'auth-mode-tab'}
                        onClick={() => onSwitchMode('register')}
                    >
                        Sign up
                    </button>
                </div>

                <form className="auth-form" onSubmit={onSubmit}>
                    {fieldErrors.general ? <div className="auth-error-summary">{fieldErrors.general}</div> : null}

                    {mode === 'register' ? (
                        <label className="auth-field">
                            <span>Name</span>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(event) => onChange('name', event.target.value)}
                                minLength={5}
                                maxLength={31}
                                autoComplete="nickname"
                                className={fieldErrors.name ? 'has-error' : ''}
                                aria-invalid={Boolean(fieldErrors.name)}
                            />
                            {fieldErrors.name ? <small>{fieldErrors.name}</small> : null}
                        </label>
                    ) : null}

                    <label className="auth-field">
                        <span>Email</span>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(event) => onChange('email', event.target.value)}
                            autoComplete="email"
                            className={fieldErrors.email ? 'has-error' : ''}
                            aria-invalid={Boolean(fieldErrors.email)}
                        />
                        {fieldErrors.email ? <small>{fieldErrors.email}</small> : null}
                    </label>

                    <label className="auth-field">
                        <span>Password</span>
                        <input
                            type="password"
                            value={form.password}
                            onChange={(event) => onChange('password', event.target.value)}
                            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                            minLength={mode === 'register' ? 10 : undefined}
                            className={fieldErrors.password ? 'has-error' : ''}
                            aria-invalid={Boolean(fieldErrors.password)}
                        />
                        {fieldErrors.password ? (
                            <small>{fieldErrors.password}</small>
                        ) : mode === 'register' ? (
                            <small>Use 10+ characters with upper, lower, digit, and symbol.</small>
                        ) : null}
                    </label>

                    {mode === 'register' ? (
                        <label className="auth-field">
                            <span>Confirm password</span>
                            <input
                                type="password"
                                value={form.confirmPassword}
                                onChange={(event) => onChange('confirmPassword', event.target.value)}
                                autoComplete="new-password"
                                minLength={10}
                                className={fieldErrors.confirmPassword ? 'has-error' : ''}
                                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                            />
                            {fieldErrors.confirmPassword ? <small>{fieldErrors.confirmPassword}</small> : null}
                        </label>
                    ) : null}

                    <label className="auth-remember">
                        <input
                            type="checkbox"
                            checked={form.rememberMe}
                            onChange={(event) => onChange('rememberMe', event.target.checked)}
                        />
                        <span>Remember me with a persistent cookie</span>
                    </label>

                    <button className="auth-submit" type="submit" disabled={busy}>
                        {busy ? 'Working...' : mode === 'login' ? 'Log in' : 'Create account'}
                    </button>
                </form>
            </section>
        </div>
    );
}

export default AuthMenu;