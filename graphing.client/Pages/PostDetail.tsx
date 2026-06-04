import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuthSession } from '../src/features/auth';
import SignedOutState from '../src/Components/SignedOutState';
import { resolveSceneAssetUrl } from '../src/features/scenes/sceneAssetUrl';
import { fetchPost, likePost, addComment, deletePost, deleteComment, reportPost, reportComment } from '../src/features/posts/postsApi';
import type { PostDetail as PostDetailType } from '../src/features/posts/postsApi';
import { banUser, unbanUser } from '../src/features/moderation/moderationApi';

type ToastTone = 'success' | 'error' | 'info';

type Toast = {
    id: string;
    tone: ToastTone;
    title: string;
    message: string;
};

type DeleteTarget =
    | { kind: 'post'; id: string; label: string }
    | { kind: 'comment'; id: string; label: string };

type ModerationTarget = {
    kind: 'post' | 'comment';
    action: 'report' | 'ban' | 'unban';
    targetId: string;
    userId: string;
    label: string;
};

export default function PostDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { accessToken, currentUser, isRestoring } = useAuthSession();
    const [post, setPost] = useState<PostDetailType | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [commentBody, setCommentBody] = useState('');
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
    const [moderationTarget, setModerationTarget] = useState<ModerationTarget | null>(null);
    const [moderationReason, setModerationReason] = useState('abuse');
    const [moderationDetails, setModerationDetails] = useState('');
    const [moderationBusy, setModerationBusy] = useState(false);

    const pushToast = (tone: ToastTone, title: string, message: string) => {
        const toastId = globalThis.crypto?.randomUUID?.() ?? `toast-${Math.random().toString(36).slice(2, 10)}`;
        setToasts((current) => [...current, { id: toastId, tone, title, message }]);
        window.setTimeout(() => {
            setToasts((current) => current.filter((toast) => toast.id !== toastId));
        }, 2600);
    };

    useEffect(() => {
        if (isRestoring) return;
        if (!id) return;
        if (!currentUser) {
            setPost(null);
            setCommentBody('');
            setError(null);
            setToasts([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        void fetchPost(id, accessToken ?? undefined)
            .then((p) => setPost(p))
            .catch((e) => {
                const message = e?.message || 'Unable to load post';
                setError(message);
                pushToast('error', 'Load failed', message);
            })
            .finally(() => setLoading(false));
    }, [id, accessToken, currentUser, isRestoring]);

    if (isRestoring) return <div>Restoring session...</div>;
    if (!id) return <div>Invalid post id.</div>;

    const onLike = async () => {
        if (!post) return;
        try {
            await likePost(post.id, accessToken ?? undefined);
            const refreshed = await fetchPost(post.id, accessToken ?? undefined);
            setPost(refreshed);
            pushToast('success', refreshed.liked ? 'Liked' : 'Unliked', refreshed.liked ? 'The post is now in your likes.' : 'The like was removed.');
        } catch (e: any) {
            const message = e?.message || 'Unable to like post';
            setError(message);
            pushToast('error', 'Like failed', message);
        }
    };

    const onAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!post || !commentBody.trim()) return;
        try {
            await addComment(post.id, commentBody.trim(), accessToken ?? undefined);
            setCommentBody('');
            const refreshed = await fetchPost(post.id, accessToken ?? undefined);
            setPost(refreshed);
            pushToast('success', 'Comment posted', 'Your comment was added to the discussion.');
        } catch (e: any) {
            const message = e?.message || 'Unable to add comment';
            setError(message);
            pushToast('error', 'Comment failed', message);
        }
    };

    return (
        <section className="scene-page scene-page--narrow">
            <header className="scene-page__header">
                <div>
                    <p className="scene-kicker">Post detail</p>
                    <h2 className="scene-title">{post?.title ?? `Post ${id}`}</h2>
                    {post ? <p className="scene-subtitle">Shared by {post.authorName ?? 'Unknown'} on {new Date(post.createdAt).toLocaleString()}</p> : null}
                </div>
                <div className="scene-page__header-actions">
                    {post ? <span className="scene-count">{post.likeCount ?? 0} likes</span> : null}
                </div>
            </header>

            {loading && <div className="scene-empty-state">Loading post...</div>}
            {error && <div className="scene-toast scene-toast--error">{error}</div>}
            {toasts.length > 0 && (
                <div style={{ display: 'grid', gap: 8, marginBottom: 14 }} aria-live="polite">
                    {toasts.map((toast) => (
                        <div key={toast.id} className={`scene-toast scene-toast--${toast.tone}`}>
                            <strong>{toast.title}</strong>
                            <span>{toast.message}</span>
                        </div>
                    ))}
                </div>
            )}

            {!currentUser && !loading && !post ? (
                <SignedOutState title="You are signed out" description="Sign in again to keep interacting with posts and comments." />
            ) : null}

            {post && (
                <div className="scene-detail">
                    <article className="scene-detail__panel post-detail__panel">
                        <div className="post-detail__title-row">
                            <div>
                                <div className="post-detail__meta">
                                    <span><strong>{post.authorName ?? 'Unknown'}</strong></span>
                                    {post.authorIsBanned ? <span className="moderation-pill">BANNED</span> : null}
                                    <span>{new Date(post.createdAt).toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="post-detail__actions">
                                <button className={`btn-like ${post.liked ? 'liked' : ''}`} onClick={onLike} disabled={!currentUser}>
                                    {post.liked ? 'Unlike' : 'Like'}
                                </button>
                                {currentUser?.isAdmin ? (
                                    post.canBanAuthor ? (
                                        post.authorIsBanned ? (
                                            <button
                                                className="scene-button scene-button--secondary"
                                                type="button"
                                                onClick={() => setModerationTarget({ kind: 'post', action: 'unban', targetId: post.id, userId: post.authorUserId, label: post.authorName ?? 'User' })}
                                            >
                                                Unban user
                                            </button>
                                        ) : (
                                            <button
                                                className="scene-button scene-button--danger"
                                                type="button"
                                                onClick={() => setModerationTarget({ kind: 'post', action: 'ban', targetId: post.id, userId: post.authorUserId, label: post.authorName ?? 'User' })}
                                            >
                                                Ban user
                                            </button>
                                        )
                                    ) : null
                                ) : (
                                    post.canReport ? (
                                        <button
                                            className="scene-button scene-button--secondary"
                                            type="button"
                                            onClick={() => setModerationTarget({ kind: 'post', action: 'report', targetId: post.id, userId: post.authorUserId, label: post.title ?? `Post ${post.id}` })}
                                        >
                                            Report
                                        </button>
                                    ) : null
                                )}
                                <Link className="scene-button scene-button--secondary" to={`/?loadPostId=${encodeURIComponent(post.id)}&fork=1`}>
                                    Open scene
                                </Link>
                                {post.canDelete ? (
                                    <button
                                        className="scene-button scene-button--danger"
                                        type="button"
                                        onClick={() => setDeleteTarget({ kind: 'post', id: post.id, label: post.title ?? `Post ${post.id}` })}
                                    >
                                        Delete post
                                    </button>
                                ) : null}
                            </div>
                        </div>

                        {post.thumbnailPath ? (
                            <Link className="post-detail__thumbnail" to={`/?loadPostId=${encodeURIComponent(post.id)}&fork=1`} aria-label="Open scene from thumbnail">
                                <img src={resolveSceneAssetUrl(post.thumbnailPath) ?? undefined} alt={post.title ?? 'Post thumbnail'} />
                            </Link>
                        ) : null}

                        <section className="post-detail__body">{post.body || 'No description provided.'}</section>
                    </article>

                    <aside className="scene-detail__panel post-detail__panel post-detail__comments-panel">
                        <h3 style={{ margin: 0 }}>Comments</h3>
                        {(!post.comments || post.comments.length === 0) ? (
                            <div className="post-detail__empty">No comments yet.</div>
                        ) : (
                            <div className="post-detail__comment-list">
                                {post.comments.map((c) => (
                                    <div key={c.id} className="post-detail__comment">
                                        <div className="post-detail__comment-meta">
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                <strong>{c.authorName ?? 'Anon'}</strong>
                                                {c.authorIsBanned ? <span className="moderation-pill">BANNED</span> : null}
                                            </div>
                                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                                <span>{new Date(c.createdAt).toLocaleString()}</span>
                                                {currentUser?.isAdmin ? (
                                                    c.canBanAuthor ? (
                                                        c.authorIsBanned ? (
                                                            <button
                                                                className="scene-button scene-button--secondary"
                                                                type="button"
                                                                onClick={() => setModerationTarget({ kind: 'comment', action: 'unban', targetId: c.id, userId: c.authorUserId, label: c.authorName ?? 'User' })}
                                                            >
                                                                Unban
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className="scene-button scene-button--danger"
                                                                type="button"
                                                                onClick={() => setModerationTarget({ kind: 'comment', action: 'ban', targetId: c.id, userId: c.authorUserId, label: c.authorName ?? 'User' })}
                                                            >
                                                                Ban
                                                            </button>
                                                        )
                                                    ) : null
                                                ) : (
                                                    c.canReport ? (
                                                        <button
                                                            className="scene-button scene-button--secondary"
                                                            type="button"
                                                            onClick={() => setModerationTarget({ kind: 'comment', action: 'report', targetId: c.id, userId: c.authorUserId, label: c.body ?? 'Comment' })}
                                                        >
                                                            Report
                                                        </button>
                                                    ) : null
                                                )}
                                                {c.canDelete ? (
                                                    <button
                                                        className="scene-button scene-button--danger"
                                                        type="button"
                                                        onClick={() => setDeleteTarget({ kind: 'comment', id: c.id, label: c.body ?? 'Comment' })}
                                                    >
                                                        Delete
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                        <div>{c.body}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {currentUser ? (
                            <form className="post-detail__comment-form" onSubmit={onAddComment}>
                                <textarea
                                    className="post-detail__textarea"
                                    value={commentBody}
                                    onChange={(e) => setCommentBody(e.target.value)}
                                    placeholder="Write a comment..."
                                />
                                <button className="scene-button" type="submit">Add comment</button>
                            </form>
                        ) : (
                            <div className="post-detail__empty">Please sign in to comment.</div>
                        )}
                    </aside>
                </div>
            )}

            {deleteTarget ? (
                <div className="scene-modal-backdrop" role="presentation" onClick={() => setDeleteTarget(null)}>
                    <div className="scene-modal" role="dialog" aria-modal="true" aria-labelledby="delete-post-title" onClick={(event) => event.stopPropagation()}>
                        <p className="scene-kicker">Confirm delete</p>
                        <h3 id="delete-post-title">
                            Delete {deleteTarget.kind === 'post' ? 'post' : 'comment'}?
                        </h3>
                        <p>{deleteTarget.label}</p>
                        <div className="scene-modal__actions">
                            <button className="scene-button scene-button--secondary" type="button" onClick={() => setDeleteTarget(null)}>
                                Cancel
                            </button>
                            <button
                                className="scene-button scene-button--danger"
                                type="button"
                                onClick={async () => {
                                    const target = deleteTarget;
                                    setDeleteTarget(null);

                                    if (!post || !target) return;

                                    try {
                                        if (target.kind === 'post') {
                                            await deletePost(post.id, accessToken ?? undefined);
                                            pushToast('success', 'Post deleted', 'The post has been removed.');
                                            navigate('/feed');
                                        } else {
                                            await deleteComment(post.id, target.id, accessToken ?? undefined);
                                            const refreshed = await fetchPost(post.id, accessToken ?? undefined);
                                            setPost(refreshed);
                                            pushToast('success', 'Comment deleted', 'The comment was removed.');
                                        }
                                    } catch (e: any) {
                                        const message = e?.message || 'Unable to delete item';
                                        setError(message);
                                        pushToast('error', 'Delete failed', message);
                                    }
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {moderationTarget ? (
                <div className="scene-modal-backdrop" role="presentation" onClick={() => setModerationTarget(null)}>
                    <div className="scene-modal" role="dialog" aria-modal="true" aria-labelledby="moderation-title" onClick={(event) => event.stopPropagation()}>
                        <p className="scene-kicker">Moderation</p>
                        <h3 id="moderation-title">
                            {moderationTarget.action === 'report'
                                ? `Report ${moderationTarget.kind}`
                                : moderationTarget.action === 'ban'
                                    ? 'Ban user'
                                    : 'Unban user'}
                        </h3>
                        <p>{moderationTarget.label}</p>

                        {moderationTarget.action === 'report' ? (
                            <>
                                <label className="feed-toolbar__field" style={{ marginTop: 10 }}>
                                    <span>Reason</span>
                                    <select value={moderationReason} onChange={(event) => setModerationReason(event.target.value)}>
                                        <option value="abuse">Abuse</option>
                                        <option value="spam">Spam</option>
                                        <option value="harassment">Harassment</option>
                                        <option value="other">Other</option>
                                    </select>
                                </label>
                                <label className="feed-toolbar__field" style={{ marginTop: 10 }}>
                                    <span>Details</span>
                                    <textarea className="post-detail__textarea" value={moderationDetails} onChange={(event) => setModerationDetails(event.target.value)} placeholder="What happened?" />
                                </label>
                            </>
                        ) : (
                            <label className="feed-toolbar__field" style={{ marginTop: 10 }}>
                                <span>{moderationTarget.action === 'ban' ? 'Ban reason' : 'Unban note (optional)'}</span>
                                <textarea className="post-detail__textarea" value={moderationDetails} onChange={(event) => setModerationDetails(event.target.value)} placeholder={moderationTarget.action === 'ban' ? 'Reason for ban' : 'Reason for unban'} />
                            </label>
                        )}

                        <div className="scene-modal__actions">
                            <button
                                className="scene-button scene-button--secondary"
                                type="button"
                                onClick={() => setModerationTarget(null)}
                                disabled={moderationBusy}
                            >
                                Cancel
                            </button>
                            <button
                                className={moderationTarget.action === 'ban' ? 'scene-button scene-button--danger' : 'scene-button'}
                                type="button"
                                disabled={moderationBusy}
                                onClick={async () => {
                                    if (!post) return;

                                    setModerationBusy(true);
                                    try {
                                        if (moderationTarget.action === 'report') {
                                            if (moderationTarget.kind === 'post') {
                                                await reportPost(post.id, moderationReason, moderationDetails, accessToken ?? undefined);
                                            } else {
                                                    await reportComment(post.id, moderationTarget.targetId, moderationReason, moderationDetails, accessToken ?? undefined);
                                            }
                                        } else if (moderationTarget.action === 'ban') {
                                            await banUser(moderationTarget.userId, moderationDetails || 'Violation of community rules', accessToken ?? undefined);
                                        } else {
                                            await unbanUser(moderationTarget.userId, accessToken ?? undefined, moderationDetails || undefined);
                                        }

                                        const refreshed = await fetchPost(post.id, accessToken ?? undefined);
                                        setPost(refreshed);

                                        pushToast(
                                            'success',
                                            moderationTarget.action === 'report'
                                                ? 'Report submitted'
                                                : moderationTarget.action === 'ban'
                                                    ? 'User banned'
                                                    : 'User unbanned',
                                            moderationTarget.action === 'report'
                                                ? 'Your report was sent to moderators.'
                                                : moderationTarget.action === 'ban'
                                                    ? 'The user has been banned.'
                                                    : 'The user has been unbanned.'
                                        );

                                        setModerationTarget(null);
                                        setModerationDetails('');
                                    } catch (e: any) {
                                        const message = e?.message || 'Unable to complete moderation action';
                                        setError(message);
                                        pushToast('error', 'Moderation failed', message);
                                    } finally {
                                        setModerationBusy(false);
                                    }
                                }}
                            >
                                {moderationTarget.action === 'report'
                                    ? 'Submit report'
                                    : moderationTarget.action === 'ban'
                                        ? 'Ban user'
                                        : 'Unban user'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    );
}
