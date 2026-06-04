import { Link } from 'react-router-dom';
import { useAuthSession } from '../src/features/auth';
import SignedOutState from '../src/Components/SignedOutState';

export default function AdminPanel() {
    const { currentUser, isRestoring } = useAuthSession();

    if (isRestoring) return <div>Restoring session...</div>;
    if (!currentUser) {
        return (
            <section className="scene-page scene-page--narrow">
                <SignedOutState title="You are signed out" description="Sign in as an admin to access moderation tools." />
            </section>
        );
    }
    if (!currentUser.isAdmin) return <div>Access denied.</div>;

    return (
        <section className="scene-page scene-page--narrow admin-home">
            <header className="scene-page__header">
                <div>
                    <p className="scene-kicker">Moderation</p>
                    <h2 className="scene-title">Admin Panel</h2>
                    <p className="scene-subtitle">Use the reports page to triage reports and the bans page to review active or historical bans.</p>
                </div>
            </header>

            <div className="admin-home__grid">
                <Link className="scene-card admin-home__card" to="/admin/reports">
                    <div className="scene-card__body">
                        <div className="scene-card__title-row">
                            <h3 className="scene-card__title">Reports</h3>
                        </div>
                        <div className="scene-card__meta">Review reported posts and comments, mark them under review, dismiss, or ban users.</div>
                    </div>
                </Link>

                <Link className="scene-card admin-home__card" to="/admin/bans">
                    <div className="scene-card__body">
                        <div className="scene-card__title-row">
                            <h3 className="scene-card__title">Bans</h3>
                        </div>
                        <div className="scene-card__meta">Browse current and past bans, jump back to the source report, and unban users.</div>
                    </div>
                </Link>
            </div>
        </section>
    );
}
