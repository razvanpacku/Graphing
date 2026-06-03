import type { AuthUser } from '../features/auth/authApi';
import { Link } from 'react-router-dom';

export interface NavbarProps {
    currentUser: AuthUser | null;
    onLogin: () => void;
    onRegister: () => void;
    onLogout: () => void;
}

function Navbar({ currentUser, onLogin, onRegister, onLogout }: NavbarProps) {
    return (
        <header className="app-navbar" aria-label="Top navigation">
            <div className="app-branding">
                <span className="app-brand-mark">Graphing</span>
                <span className="app-brand-subtitle">social graphs and live scenes</span>
            </div>

            <nav className="app-nav-links">
                <Link to="/" className="nav-link">Home</Link>
                <Link to="/feed" className="nav-link">Feed</Link>
                <Link to="/scenes" className="nav-link">My Scenes</Link>
                {currentUser?.isAdmin && (
                    <Link to="/admin" className="nav-link nav-link-admin">Admin Panel</Link>
                )}
            </nav>

            <div className="app-navbar-actions">
                <span className="auth-status" aria-live="polite">
                    {currentUser ? `Signed in as ${currentUser.name}` : 'Guest'}
                </span>
                {currentUser ? (
                    <>
                        <span className="user-chip">{currentUser.name}</span>
                        <button className="nav-button nav-button-secondary" type="button" onClick={onLogout}>
                            Log out
                        </button>
                    </>
                ) : (
                    <>
                        <button className="nav-button" type="button" onClick={onLogin}>
                            Log in
                        </button>
                        <button className="nav-button nav-button-secondary" type="button" onClick={onRegister}>
                            Sign up
                        </button>
                    </>
                )}
            </div>
        </header>
    );
}

export default Navbar;