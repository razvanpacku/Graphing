export type PostSummary = {
    id: number;
    title?: string | null;
    authorName?: string | null;
    createdAt: string;
};

export type PostDetail = {
    id: number;
    title?: string | null;
    body?: string | null;
    authorName?: string | null;
    createdAt: string;
    comments?: Array<{ id: number; authorName?: string; body?: string; createdAt: string }>;
    liked?: boolean;
    likeCount?: number;
};

const jsonHeaders = (accessToken?: string) => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
});

export async function fetchPosts(): Promise<PostSummary[]> {
    const res = await fetch('/api/posts');
    if (!res.ok) throw new Error(await res.text() || res.statusText);
    return res.json();
}

export async function fetchPost(id: number, accessToken?: string): Promise<PostDetail> {
    const res = await fetch(`/api/posts/${id}`, { headers: jsonHeaders(accessToken) });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
    return res.json();
}

export async function likePost(id: number, accessToken?: string): Promise<void> {
    const res = await fetch(`/api/posts/${id}/like`, { method: 'POST', headers: jsonHeaders(accessToken) });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
}

export async function addComment(id: number, body: string, accessToken?: string): Promise<void> {
    const res = await fetch(`/api/posts/${id}/comments`, {
        method: 'POST',
        headers: jsonHeaders(accessToken),
        body: JSON.stringify({ body })
    });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
}
