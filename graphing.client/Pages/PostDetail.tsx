import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuthSession } from '../src/features/auth';
import SignedOutState from '../src/Components/SignedOutState';
import { resolveSceneAssetUrl } from '../src/features/scenes/sceneAssetUrl';
import { fetchPost, likePost, addComment, deletePost, deleteComment } from '../src/features/posts/postsApi';
import type { PostDetail as PostDetailType } from '../src/features/posts/postsApi';

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
                                    <span>{new Date(post.createdAt).toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="post-detail__actions">
                                <button className={`btn-like ${post.liked ? 'liked' : ''}`} onClick={onLike} disabled={!currentUser}>
                                    {post.liked ? 'Unlike' : 'Like'}
                                </button>
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
                                            <strong>{c.authorName ?? 'Anon'}</strong>
                                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                                <span>{new Date(c.createdAt).toLocaleString()}</span>
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
        </section>
    );
}
