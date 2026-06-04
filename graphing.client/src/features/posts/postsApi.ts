export type PostSummary = {
    id: string;
    title?: string | null;
    authorName?: string | null;
    authorUserId: string;
    authorIsBanned?: boolean;
    description?: string | null;
    thumbnailPath?: string | null;
    liked?: boolean;
    likeCount?: number;
    commentCount?: number;
    canReport?: boolean;
    canBanAuthor?: boolean;
    createdAt: string;
};

export type PagedResult<T> = {
    items: T[];
    total: number;
};

export type PostDetail = {
    id: string;
    title?: string | null;
    body?: string | null;
    authorName?: string | null;
    authorUserId: string;
    authorIsBanned?: boolean;
    thumbnailPath?: string | null;
    canDelete?: boolean;
    canReport?: boolean;
    canBanAuthor?: boolean;
    createdAt: string;
    comments?: Array<{ id: string; authorName?: string; authorUserId: string; authorIsBanned?: boolean; body?: string; createdAt: string; canDelete?: boolean; canReport?: boolean; canBanAuthor?: boolean }>;
    liked?: boolean;
    likeCount?: number;
};

export type PostScene = {
    postId: string;
    sceneVersionId: string;
    sceneId: string;
    title: string;
    description?: string | null;
    sceneJson: string;
    cameraJson: string;
    thumbnailPath?: string | null;
    createdAt: string;
};

const jsonHeaders = (accessToken?: string) => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
});

export async function fetchPosts(page = 1, pageSize = 20, accessToken?: string, options?: { search?: string; sort?: 'newest' | 'popular'; window?: 'all' | 'month' | 'week' | 'day' }): Promise<PagedResult<PostSummary>> {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (options?.search) params.set('search', options.search);
    if (options?.sort) params.set('sort', options.sort === 'popular' ? 'Popular' : 'Newest');
    if (options?.window) {
        const mappedWindow = {
            all: 'AllTime',
            month: 'Month',
            week: 'Week',
            day: 'Day'
        }[options.window];

        params.set('window', mappedWindow);
    }
    const res = await fetch(`/api/posts?${params.toString()}`, { headers: jsonHeaders(accessToken) });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
    return res.json();
}

export async function fetchPost(id: string, accessToken?: string): Promise<PostDetail> {
    const res = await fetch(`/api/posts/${id}`, { headers: jsonHeaders(accessToken) });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
    return res.json();
}

export async function fetchPostScene(id: string, accessToken?: string): Promise<PostScene> {
    const res = await fetch(`/api/posts/${id}/scene`, { headers: jsonHeaders(accessToken) });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
    return res.json();
}

export type CreatePostRequest = {
    sceneVersionId: string;
    title: string;
    description?: string | null;
    thumbnailPath?: string | null;
};

export async function createPost(req: CreatePostRequest, accessToken?: string): Promise<{ id: string }> {
    const res = await fetch('/api/posts', { method: 'POST', headers: jsonHeaders(accessToken), body: JSON.stringify(req) });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
    return res.json();
}

export async function likePost(id: string, accessToken?: string): Promise<void> {
    const res = await fetch(`/api/posts/${id}/like`, { method: 'POST', headers: jsonHeaders(accessToken) });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
}

export async function addComment(id: string, body: string, accessToken?: string): Promise<void> {
    const res = await fetch(`/api/posts/${id}/comments`, {
        method: 'POST',
        headers: jsonHeaders(accessToken),
        body: JSON.stringify({ body })
    });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
}

export async function deletePost(id: string, accessToken?: string): Promise<void> {
    const res = await fetch(`/api/posts/${id}`, { method: 'DELETE', headers: jsonHeaders(accessToken) });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
}

export async function deleteComment(postId: string, commentId: string, accessToken?: string): Promise<void> {
    const res = await fetch(`/api/posts/${postId}/comments/${commentId}`, { method: 'DELETE', headers: jsonHeaders(accessToken) });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
}

export async function reportPost(id: string, reasonCode: string, details: string, accessToken?: string): Promise<void> {
    const res = await fetch(`/api/posts/${id}/report`, {
        method: 'POST',
        headers: jsonHeaders(accessToken),
        body: JSON.stringify({ reasonCode, details })
    });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
}

export async function reportComment(postId: string, commentId: string, reasonCode: string, details: string, accessToken?: string): Promise<void> {
    const res = await fetch(`/api/posts/${postId}/comments/${commentId}/report`, {
        method: 'POST',
        headers: jsonHeaders(accessToken),
        body: JSON.stringify({ reasonCode, details })
    });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
}
