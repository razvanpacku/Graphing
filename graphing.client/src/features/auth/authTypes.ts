export type AuthMode = 'login' | 'register';

export type AuthFormState = {
    email: string;
    name: string;
    password: string;
    confirmPassword: string;
    rememberMe: boolean;
};

export type FieldErrorState = Partial<Record<'email' | 'name' | 'password' | 'confirmPassword' | 'general', string>>;

export const initialAuthFormState: AuthFormState = {
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
    rememberMe: false
};