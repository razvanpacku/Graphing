const jsonHeaders = (accessToken?: string) => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
});

export type ModerationReportStatus = 'open' | 'underReview' | 'dismissed' | 'actioned';

export type ModerationReport = {
    id: string;
    reporterUserId: string;
    reporterName: string;
    targetType: 'Post' | 'Comment' | 'Scene' | 'User';
    targetId: string;
    targetPostId?: string | null;
    targetPostTitle?: string | null;
    reasonCode: string;
    details: string;
    status: 'Open' | 'UnderReview' | 'Dismissed' | 'Actioned';
    createdAtUtc: string;
    reviewedByUserId?: string | null;
    reviewedByName?: string | null;
    reviewedAtUtc?: string | null;
    resolutionNotes?: string | null;
    targetAuthorUserId?: string | null;
    targetAuthorName?: string | null;
    targetAuthorIsBanned?: boolean;
    targetPreview?: string | null;
};

export type PagedModerationResult<T> = {
    items: T[];
    total: number;
};

export type ModerationBan = {
    id: string;
    userId: string;
    userName: string;
    adminUserId: string;
    adminName: string;
    reason: string;
    notes?: string | null;
    startedAtUtc: string;
    endsAtUtc?: string | null;
    isActive: boolean;
    sourceReportId?: string | null;
    sourceReportTargetType?: string | null;
    sourceReportTargetId?: string | null;
    sourceReportTargetPostId?: string | null;
    sourceReportTargetPostTitle?: string | null;
    sourceReportReasonCode?: string | null;
};

const statusToServer = {
    open: 'Open',
    underReview: 'UnderReview',
    dismissed: 'Dismissed',
    actioned: 'Actioned'
} as const;

export async function fetchModerationReports(accessToken?: string, status?: ModerationReportStatus, page = 1, pageSize = 10): Promise<PagedModerationResult<ModerationReport>> {
    const params = new URLSearchParams();
    if (status) {
        params.set('status', statusToServer[status]);
    }

    params.set('page', String(page));
    params.set('pageSize', String(pageSize));

    const qs = params.toString();
    const res = await fetch(`/api/moderation/reports${qs ? `?${qs}` : ''}`, { headers: jsonHeaders(accessToken) });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
    return res.json();
}

export async function fetchBans(accessToken?: string, activeOnly = true, page = 1, pageSize = 10): Promise<PagedModerationResult<ModerationBan>> {
    const params = new URLSearchParams({ activeOnly: String(activeOnly), page: String(page), pageSize: String(pageSize) });
    const res = await fetch(`/api/moderation/bans?${params.toString()}`, { headers: jsonHeaders(accessToken) });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
    return res.json();
}

export async function banUser(userId: string, reason: string, accessToken?: string, options?: { notes?: string; sourceReportId?: string }): Promise<void> {
    const res = await fetch(`/api/moderation/users/${encodeURIComponent(userId)}/ban`, {
        method: 'POST',
        headers: jsonHeaders(accessToken),
        body: JSON.stringify({
            reason,
            notes: options?.notes,
            sourceReportId: options?.sourceReportId
        })
    });

    if (!res.ok) throw new Error(await res.text() || res.statusText);
}

export async function unbanUser(userId: string, accessToken?: string, notes?: string): Promise<void> {
    const res = await fetch(`/api/moderation/users/${encodeURIComponent(userId)}/unban`, {
        method: 'POST',
        headers: jsonHeaders(accessToken),
        body: JSON.stringify({ notes })
    });

    if (!res.ok) throw new Error(await res.text() || res.statusText);
}

export async function updateReportStatus(reportId: string, status: ModerationReportStatus, accessToken?: string, resolutionNotes?: string): Promise<void> {
    const res = await fetch(`/api/moderation/reports/${encodeURIComponent(reportId)}/status`, {
        method: 'POST',
        headers: jsonHeaders(accessToken),
        body: JSON.stringify({ status: statusToServer[status], resolutionNotes })
    });

    if (!res.ok) throw new Error(await res.text() || res.statusText);
}
