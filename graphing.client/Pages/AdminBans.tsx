import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthSession } from '../src/features/auth';
import { fetchBans, unbanUser, type ModerationBan, type PagedModerationResult } from '../src/features/moderation/moderationApi';
import SignedOutState from '../src/Components/SignedOutState';

const PAGE_SIZE = 10;

function compactText(value: string, limit = 120): string {
    const normalized = value.trim().replace(/\s+/g, ' ');
    return normalized.length > limit ? `${normalized.slice(0, limit - 1)}…` : normalized;
}

export default function AdminBans() {
    const { currentUser, accessToken, isRestoring } = useAuthSession();
    const [searchParams, setSearchParams] = useSearchParams();
    const [bans, setBans] = useState<ModerationBan[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeOnly, setActiveOnly] = useState((searchParams.get('activeOnly') ?? 'true') === 'true');
    const [busyActionKey, setBusyActionKey] = useState<string | null>(null);
    const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

    useEffect(() => {
        setActiveOnly((searchParams.get('activeOnly') ?? 'true') === 'true');
    }, [searchParams]);

    useEffect(() => {
        if (isRestoring) return;
        if (!currentUser?.isAdmin) return;

        setLoading(true);
        setError(null);

        fetchBans(accessToken ?? undefined, activeOnly, page, PAGE_SIZE)
            .then((result: PagedModerationResult<ModerationBan>) => {
                setBans(result.items);
                setTotal(result.total);
            })
            .catch((e: any) => setError(e?.message || 'Unable to load bans.'))
            .finally(() => setLoading(false));
    }, [currentUser, accessToken, isRestoring, activeOnly, page]);

    if (isRestoring) return <div>Restoring session...</div>;
    if (!currentUser) {
        return (
            <section className="scene-page scene-page--narrow">
                <SignedOutState title="You are signed out" description="Sign in as an admin to access moderation tools." />
            </section>
        );
    }
    if (!currentUser.isAdmin) return <div>Access denied.</div>;

    const updateSearch = (next: Record<string, string | null | undefined>) => {
        const current = new URLSearchParams(searchParams);
        for (const [key, value] of Object.entries(next)) {
            if (value == null || value === '') current.delete(key);
            else current.set(key, value);
        }
        setSearchParams(current, { replace: true });
    };

    return (
        <section className="scene-page scene-page--wide admin-page">
            <header className="scene-page__header">
                <div>
                    <p className="scene-kicker">Moderation</p>
                    <h2 className="scene-title">Bans</h2>
                    <p className="scene-subtitle">Browse active and historical bans in pages, then jump back to the source report if one exists.</p>
                </div>
                <div className="scene-page__header-actions">
                    <span className="scene-count">{total} total</span>
                </div>
            </header>

            <div className="feed-toolbar scene-detail__panel">
                <label className="feed-toolbar__field">
                    <span>Scope</span>
                    <select
                        value={activeOnly ? 'active' : 'all'}
                        onChange={(event) => {
                            const nextActiveOnly = event.target.value === 'active';
                            setActiveOnly(nextActiveOnly);
                            updateSearch({ activeOnly: String(nextActiveOnly), page: '1' });
                        }}
                    >
                        <option value="active">Active only</option>
                        <option value="all">Active + history</option>
                    </select>
                </label>
                <div className="feed-toolbar__meta">
                    <span>Page {page} of {totalPages}</span>
                </div>
            </div>

            {loading ? <div className="scene-empty-state">Loading bans...</div> : null}
            {error ? <div className="scene-toast scene-toast--error">{error}</div> : null}

            <section className="scene-detail__panel post-detail__panel admin-moderation-panel">
                <div className="admin-page__panelHeader">
                    <h3 style={{ margin: 0 }}>Ban list</h3>
                    <div className="moderation-page-nav">
                        <button className="scene-button scene-button--secondary" type="button" disabled={page <= 1} onClick={() => updateSearch({ page: String(Math.max(1, page - 1)) })}>Previous</button>
                        <button className="scene-button scene-button--secondary" type="button" disabled={page >= totalPages} onClick={() => updateSearch({ page: String(Math.min(totalPages, page + 1)) })}>Next</button>
                    </div>
                </div>

                {bans.length === 0 ? (
                    <div className="post-detail__empty">No bans found for this filter.</div>
                ) : (
                    <div className="post-detail__comment-list">
                        {bans.map((ban) => (
                            <article key={ban.id} className="post-detail__comment moderation-card moderation-card--ban">
                                <div className="post-detail__comment-meta moderation-card__meta">
                                    <strong>{ban.userName}</strong>
                                    <span>{ban.isActive ? 'Active' : 'Inactive'}</span>
                                </div>
                                <div><strong>Reason:</strong> {compactText(ban.reason)}</div>
                                {ban.notes ? <div><strong>Notes:</strong> {compactText(ban.notes)}</div> : null}
                                <div><strong>Issued by:</strong> {ban.adminName}</div>
                                <div><strong>Started:</strong> {new Date(ban.startedAtUtc).toLocaleString()}</div>
                                {ban.endsAtUtc ? <div><strong>Ended:</strong> {new Date(ban.endsAtUtc).toLocaleString()}</div> : null}
                                {ban.sourceReportId ? (
                                    <div className="moderation-target">
                                        <strong>Source report:</strong>
                                        <span>
                                            {ban.sourceReportTargetType ?? 'Report'} on{' '}
                                            <Link className="moderation-link" to={`/admin/reports?highlight=${ban.sourceReportId}`}>
                                                {ban.sourceReportTargetPostTitle ?? ban.sourceReportTargetId ?? 'view report'}
                                            </Link>
                                            {ban.sourceReportReasonCode ? ` · ${ban.sourceReportReasonCode}` : ''}
                                        </span>
                                    </div>
                                ) : null}
                                {ban.isActive ? (
                                    <button
                                        className="scene-button scene-button--secondary"
                                        type="button"
                                        disabled={busyActionKey === `${ban.id}-unban`}
                                        onClick={async () => {
                                            setBusyActionKey(`${ban.id}-unban`);
                                            try {
                                                await unbanUser(ban.userId, accessToken ?? undefined);
                                                const refreshed = await fetchBans(accessToken ?? undefined, activeOnly, page, PAGE_SIZE);
                                                setBans(refreshed.items);
                                                setTotal(refreshed.total);
                                            } catch (e: any) {
                                                setError(e?.message || 'Unable to unban user.');
                                            } finally {
                                                setBusyActionKey(null);
                                            }
                                        }}
                                    >
                                        Unban
                                    </button>
                                ) : null}
                            </article>
                        ))}
                    </div>
                )}

                <div className="scene-pagination">
                    <button className="scene-button scene-button--secondary" type="button" disabled={page <= 1} onClick={() => updateSearch({ page: String(Math.max(1, page - 1)) })}>Previous</button>
                    <span className="scene-pagination__status">Page {page} of {totalPages}</span>
                    <button className="scene-button scene-button--secondary" type="button" disabled={page >= totalPages} onClick={() => updateSearch({ page: String(Math.min(totalPages, page + 1)) })}>Next</button>
                </div>
            </section>
        </section>
    );
}
