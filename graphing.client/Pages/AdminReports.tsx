import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthSession } from '../src/features/auth';
import { banUser, fetchModerationReports, unbanUser, updateReportStatus, type ModerationReport, type ModerationReportStatus, type PagedModerationResult } from '../src/features/moderation/moderationApi';
import SignedOutState from '../src/Components/SignedOutState';

const PAGE_SIZE = 10;
const reportStatusLabels = ['Open', 'UnderReview', 'Dismissed', 'Actioned'] as const;
const targetTypeLabels = ['Post', 'Comment', 'Scene', 'User'] as const;

function reportStatusLabel(status: ModerationReport['status']): string {
    return typeof status === 'string' ? status : reportStatusLabels[status] ?? String(status);
}

function targetTypeLabel(targetType: ModerationReport['targetType']): string {
    return typeof targetType === 'string' ? targetType : targetTypeLabels[targetType] ?? String(targetType);
}

function compactText(value: string, limit = 120): string {
    const normalized = value.trim().replace(/\s+/g, ' ');
    return normalized.length > limit ? `${normalized.slice(0, limit - 1)}…` : normalized;
}

export default function AdminReports() {
    const { currentUser, accessToken, isRestoring } = useAuthSession();
    const [searchParams, setSearchParams] = useSearchParams();
    const [reports, setReports] = useState<ModerationReport[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busyActionKey, setBusyActionKey] = useState<string | null>(null);
    const [highlightReportId, setHighlightReportId] = useState<string | null>(searchParams.get('highlight'));

    const statusFilter = (searchParams.get('status') ?? 'all') as ModerationReportStatus | 'all';
    const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);
    const normalizedStatus = (report: ModerationReport) => {
        const raw = typeof report.status === 'string' ? report.status : reportStatusLabel(report.status);
        return raw ? raw.replace(/\s+/g, '').toLowerCase() : '';
    };

    const openReports = useMemo(() => reports.filter((report) => normalizedStatus(report) === 'open').length, [reports]);

    useEffect(() => {
        setHighlightReportId(searchParams.get('highlight'));
    }, [searchParams]);

    useEffect(() => {
        if (!highlightReportId || loading || reports.length === 0) return;

        const highlighted = document.getElementById(`report-${highlightReportId}`);
        if (highlighted) {
            highlighted.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
    }, [highlightReportId, loading, reports]);

    useEffect(() => {
        if (isRestoring) return;
        if (!currentUser?.isAdmin) return;

        setLoading(true);
        setError(null);

        const reportStatus = statusFilter === 'all' ? undefined : statusFilter;
        fetchModerationReports(accessToken ?? undefined, reportStatus, page, PAGE_SIZE)
            .then((reportsResult) => {
                setReports((reportsResult as PagedModerationResult<ModerationReport>).items);
                setTotal((reportsResult as PagedModerationResult<ModerationReport>).total);
            })
            .catch((e: any) => setError(e?.message || 'Unable to load reports.'))
            .finally(() => setLoading(false));
    }, [currentUser, accessToken, isRestoring, statusFilter, page]);

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
                    <h2 className="scene-title">Reports</h2>
                    <p className="scene-subtitle">Triage post and comment reports in pages, then jump to the post or act on the report directly.</p>
                </div>
                <div className="scene-page__header-actions">
                    <span className="scene-count">{openReports} open on page</span>
                    <span className="scene-count">{total} total</span>
                </div>
            </header>

            <div className="feed-toolbar scene-detail__panel">
                <label className="feed-toolbar__field">
                    <span>Report status</span>
                    <select
                        value={statusFilter}
                        onChange={(event) => {
                            updateSearch({ status: event.target.value === 'all' ? null : event.target.value, page: '1' });
                        }}
                    >
                        <option value="all">All</option>
                        <option value="open">Open</option>
                        <option value="underReview">Under review</option>
                        <option value="dismissed">Dismissed</option>
                        <option value="actioned">Actioned</option>
                    </select>
                </label>
                <div className="feed-toolbar__meta">
                    <span>Page {page} of {totalPages}</span>
                    {searchParams.get('highlight') ? <span>Jump target selected</span> : null}
                </div>
            </div>

            {loading ? <div className="scene-empty-state">Loading reports...</div> : null}
            {error ? <div className="scene-toast scene-toast--error">{error}</div> : null}

            <section className="scene-detail__panel post-detail__panel admin-moderation-panel">
                <div className="admin-page__panelHeader">
                    <h3 style={{ margin: 0 }}>Reports</h3>
                    <div className="moderation-page-nav">
                        <button className="scene-button scene-button--secondary" type="button" disabled={page <= 1} onClick={() => updateSearch({ page: String(Math.max(1, page - 1)) })}>Previous</button>
                        <button className="scene-button scene-button--secondary" type="button" disabled={page >= totalPages} onClick={() => updateSearch({ page: String(Math.min(totalPages, page + 1)) })}>Next</button>
                    </div>
                </div>

                {reports.length === 0 ? (
                    <div className="post-detail__empty">No reports found for this filter.</div>
                ) : (
                    <div className="post-detail__comment-list">
                        {reports.map((report) => (
                            <article
                                key={report.id}
                                id={`report-${report.id}`}
                                className={`post-detail__comment moderation-card ${highlightReportId === report.id ? 'moderation-report--highlight' : ''}`}
                            >
                                <div className="post-detail__comment-meta moderation-card__meta">
                                    <strong>{targetTypeLabel(report.targetType)} report</strong>
                                    <span>{new Date(report.createdAtUtc).toLocaleString()}</span>
                                </div>
                                <div>
                                    <strong>Status:</strong>{' '}
                                    <span className={`moderation-status moderation-status--${reportStatusLabel(report.status).toLowerCase()}`}>{reportStatusLabel(report.status)}</span>
                                </div>
                                <div><strong>Reporter:</strong> {report.reporterName}</div>
                                <div><strong>Reason:</strong> {report.reasonCode}</div>
                                <div className="moderation-target">
                                    <strong>Target:</strong>
                                    <span>
                                        {targetTypeLabel(report.targetType) === 'Comment' ? 'Comment on' : 'Post'}{' '}
                                        {report.targetPostId ? (
                                            <Link className="moderation-link" to={`/posts/${report.targetPostId}`}>
                                                {report.targetPostTitle ?? `post ${report.targetPostId.slice(0, 8)}`}
                                            </Link>
                                        ) : (
                                            report.targetPostTitle ?? `${targetTypeLabel(report.targetType)} ${report.targetId.slice(0, 8)}`
                                        )}
                                        {report.targetAuthorName ? ` · ${report.targetAuthorName}` : ''}
                                        {report.targetAuthorIsBanned ? ' (BANNED)' : ''}
                                    </span>
                                </div>
                                {targetTypeLabel(report.targetType) === 'Comment' && report.targetPreview ? <div><strong>Comment:</strong> {compactText(report.targetPreview)}</div> : null}
                                <div className="moderation-details"><strong>Details:</strong> {compactText(report.details)}</div>
                                <div className="moderation-actions">
                                    {report.targetPostId ? (
                                        <Link className="scene-button scene-button--secondary" to={`/posts/${report.targetPostId}`}>
                                            Open post
                                        </Link>
                                    ) : targetTypeLabel(report.targetType) === 'Comment' ? (
                                        <button className="scene-button scene-button--secondary" type="button" disabled>
                                            Open post unavailable
                                        </button>
                                    ) : null}
                                    {reportStatusLabel(report.status) === 'Open' ? (
                                        <button
                                            className="scene-button scene-button--secondary"
                                            type="button"
                                            disabled={busyActionKey === report.id}
                                            onClick={async () => {
                                                setBusyActionKey(report.id);
                                                try {
                                                    await updateReportStatus(report.id, 'underReview', accessToken ?? undefined);
                                                    setHighlightReportId(report.id);
                                                    updateSearch({ status: 'underReview', page: '1', highlight: report.id });
                                                    const refreshed = await fetchModerationReports(accessToken ?? undefined, 'underReview', 1, PAGE_SIZE);
                                                    setReports(refreshed.items);
                                                    setTotal(refreshed.total);
                                                } catch (e: any) {
                                                    setError(e?.message || 'Unable to update report status.');
                                                } finally {
                                                    setBusyActionKey(null);
                                                }
                                            }}
                                        >
                                            Mark under review
                                        </button>
                                    ) : null}
                                    {(reportStatusLabel(report.status) === 'Open' || reportStatusLabel(report.status) === 'UnderReview') ? (
                                        <button
                                            className="scene-button"
                                            type="button"
                                            disabled={busyActionKey === `${report.id}-dismiss`}
                                            onClick={async () => {
                                                setBusyActionKey(`${report.id}-dismiss`);
                                                try {
                                                    await updateReportStatus(report.id, 'dismissed', accessToken ?? undefined);
                                                    const refreshed = await fetchModerationReports(accessToken ?? undefined, statusFilter === 'all' ? undefined : statusFilter, page, PAGE_SIZE);
                                                    setReports(refreshed.items);
                                                    setTotal(refreshed.total);
                                                } catch (e: any) {
                                                    setError(e?.message || 'Unable to dismiss report.');
                                                } finally {
                                                    setBusyActionKey(null);
                                                }
                                            }}
                                        >
                                            Dismiss
                                        </button>
                                    ) : null}
                                    {report.targetAuthorUserId && !report.targetAuthorIsBanned && normalizedStatus(report) === 'underreview' ? (
                                        <button
                                            className="scene-button scene-button--danger"
                                            type="button"
                                            disabled={busyActionKey === `${report.id}-ban`}
                                            onClick={async () => {
                                                setBusyActionKey(`${report.id}-ban`);
                                                try {
                                                    await banUser(report.targetAuthorUserId!, `Actioned report: ${report.reasonCode}`, accessToken ?? undefined, { sourceReportId: report.id });
                                                    const updatedReports = await fetchModerationReports(accessToken ?? undefined, statusFilter === 'all' ? undefined : statusFilter, page, PAGE_SIZE);
                                                    setReports(updatedReports.items);
                                                    setTotal(updatedReports.total);
                                                } catch (e: any) {
                                                    setError(e?.message || 'Unable to ban user from report.');
                                                } finally {
                                                    setBusyActionKey(null);
                                                }
                                            }}
                                        >
                                            Ban user
                                        </button>
                                    ) : null}
                                    {report.targetAuthorUserId && report.targetAuthorIsBanned ? (
                                        <button
                                            className="scene-button scene-button--secondary"
                                            type="button"
                                            disabled={busyActionKey === `${report.id}-unban`}
                                            onClick={async () => {
                                                setBusyActionKey(`${report.id}-unban`);
                                                try {
                                                    await unbanUser(report.targetAuthorUserId!, accessToken ?? undefined);
                                                    const updatedReports = await fetchModerationReports(accessToken ?? undefined, statusFilter === 'all' ? undefined : statusFilter, page, PAGE_SIZE);
                                                    setReports(updatedReports.items);
                                                    setTotal(updatedReports.total);
                                                } catch (e: any) {
                                                    setError(e?.message || 'Unable to unban user from report.');
                                                } finally {
                                                    setBusyActionKey(null);
                                                }
                                            }}
                                        >
                                            Unban user
                                        </button>
                                    ) : null}
                                </div>
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
