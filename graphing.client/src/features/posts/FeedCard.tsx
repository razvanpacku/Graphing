import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { PostSummary } from './postsApi';
import { likePost, reportPost } from './postsApi';
import { resolveSceneAssetUrl } from '../scenes/sceneAssetUrl';
import { banUser, unbanUser } from '../moderation/moderationApi';

type FeedCardProps = {
    post: PostSummary;
    accessToken?: string;
    isAdmin?: boolean;
    onLike?: (id: string) => void;
    onRefresh?: () => void;
};

export default function FeedCard({ post, accessToken, isAdmin, onLike, onRefresh }: FeedCardProps) {
    const navigate = useNavigate();
    const [liking, setLiking] = useState(false);
    const [liked, setLiked] = useState(!!post.liked);
    const [count, setCount] = useState(post.likeCount ?? 0);
    const [toast, setToast] = useState<string | null>(null);
    const [moderationOpen, setModerationOpen] = useState<null | 'report' | 'ban' | 'unban'>(null);
    const [reasonCode, setReasonCode] = useState('abuse');
    const [details, setDetails] = useState('');
    const [modBusy, setModBusy] = useState(false);

    useEffect(() => {
        setLiked(!!post.liked);
        setCount(post.likeCount ?? 0);
    }, [post.id, post.liked, post.likeCount]);

    useEffect(() => {
        if (!toast) return;
        const timeout = window.setTimeout(() => setToast(null), 2200);
        return () => window.clearTimeout(timeout);
    }, [toast]);

    const handleLike = async () => {
        if (liking) return;
        setLiking(true);
        // optimistic update
        const nextLiked = !liked;
        setLiked(nextLiked);
        setCount((c) => (nextLiked ? c + 1 : Math.max(0, c - 1)));
        try {
            await likePost(post.id, accessToken ?? undefined);
            setToast(nextLiked ? 'Liked' : 'Unliked');
            onLike?.(post.id);
        } catch (err) {
            // revert
            setLiked(!nextLiked);
            setCount((c) => (nextLiked ? Math.max(0, c - 1) : c + 1));
            setToast('Unable to update like. Please try again.');
        } finally {
            setLiking(false);
        }
    };

    const openPost = () => {
        navigate(`/posts/${post.id}`);
    };

    const openSceneUrl = `/?loadPostId=${encodeURIComponent(post.id)}&fork=1`;

    return (
        <article
            className="feed-card"
            role="link"
            tabIndex={0}
            onClick={openPost}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openPost();
                }
            }}
        >
            {post.thumbnailPath ? (
                <Link className="feed-card-thumbLink" to={openSceneUrl} onClick={(event) => event.stopPropagation()} aria-label="Open scene">
                    <img className="feed-card-thumb" src={resolveSceneAssetUrl(post.thumbnailPath) ?? undefined} alt={post.title ?? 'thumb'} />
                </Link>
            ) : (
                <Link className="feed-card-thumbLink feed-card-thumbLink--empty" to={openSceneUrl} onClick={(event) => event.stopPropagation()} aria-label="Open scene" />
            )}
            <div className="feed-card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <h3 className="feed-card-title">{post.title ?? 'Untitled'}</h3>
                    <small>{new Date(post.createdAt).toLocaleString()}</small>
                </div>
                <div className="feed-card-meta">
                    {post.authorName ?? 'Unknown'}
                    {post.authorIsBanned ? <span className="moderation-pill">BANNED</span> : null}
                </div>
                {post.description ? <p className="feed-card-description">{post.description.split(/\s+/).slice(0, 12).join(' ')}{post.description.split(/\s+/).length > 12 ? '…' : ''}</p> : null}
                <div className="feed-card-stats">
                    <span>{post.commentCount ?? 0} comments</span>
                    <span>{count} likes</span>
                </div>
                <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button className={`btn-like ${liked ? 'liked' : ''}`} onClick={(event) => { event.stopPropagation(); void handleLike(); }} disabled={liking}>
                        {liked ? 'Liked' : 'Like'}
                    </button>
                    <Link className="scene-button scene-button--secondary" to={`/posts/${post.id}`} onClick={(event) => event.stopPropagation()}>
                        Open post
                    </Link>
                    <Link className="scene-button scene-button--secondary" to={openSceneUrl} onClick={(event) => event.stopPropagation()}>
                        Open scene
                    </Link>
                    {isAdmin ? (
                        post.canBanAuthor ? (
                            post.authorIsBanned ? (
                                <button className="scene-button scene-button--secondary" type="button" onClick={(event) => { event.stopPropagation(); setModerationOpen('unban'); }}>
                                    Unban
                                </button>
                            ) : (
                                <button className="scene-button scene-button--danger" type="button" onClick={(event) => { event.stopPropagation(); setModerationOpen('ban'); }}>
                                    Ban
                                </button>
                            )
                        ) : null
                    ) : (
                        post.canReport ? (
                            <button className="scene-button scene-button--secondary" type="button" onClick={(event) => { event.stopPropagation(); setModerationOpen('report'); }}>
                                Report
                            </button>
                        ) : null
                    )}
                </div>
                {toast ? <div className="scene-toast" style={{ marginTop: 10, marginBottom: 0 }}>{toast}</div> : null}
            </div>

            {moderationOpen ? (
                <div className="scene-modal-backdrop" role="presentation" onClick={(event) => { event.stopPropagation(); setModerationOpen(null); }}>
                    <div className="scene-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
                        <p className="scene-kicker">Moderation</p>
                        <h3>
                            {moderationOpen === 'report' ? 'Report this post' : moderationOpen === 'ban' ? 'Ban this user' : 'Unban this user'}
                        </h3>
                        {moderationOpen === 'report' ? (
                            <>
                                <label className="feed-toolbar__field" style={{ marginTop: 10 }}>
                                    <span>Reason</span>
                                    <select value={reasonCode} onChange={(event) => setReasonCode(event.target.value)}>
                                        <option value="abuse">Abuse</option>
                                        <option value="spam">Spam</option>
                                        <option value="harassment">Harassment</option>
                                        <option value="other">Other</option>
                                    </select>
                                </label>
                                <label className="feed-toolbar__field" style={{ marginTop: 10 }}>
                                    <span>Details</span>
                                    <textarea className="post-detail__textarea" value={details} onChange={(event) => setDetails(event.target.value)} placeholder="What happened?" />
                                </label>
                            </>
                        ) : (
                            <label className="feed-toolbar__field" style={{ marginTop: 10 }}>
                                <span>{moderationOpen === 'ban' ? 'Ban reason' : 'Unban note (optional)'}</span>
                                <textarea className="post-detail__textarea" value={details} onChange={(event) => setDetails(event.target.value)} placeholder={moderationOpen === 'ban' ? 'Reason for this ban' : 'Reason for unbanning'} />
                            </label>
                        )}
                        <div className="scene-modal__actions">
                            <button className="scene-button scene-button--secondary" type="button" onClick={() => setModerationOpen(null)} disabled={modBusy}>
                                Cancel
                            </button>
                            <button
                                className={moderationOpen === 'ban' ? 'scene-button scene-button--danger' : 'scene-button'}
                                type="button"
                                disabled={modBusy}
                                onClick={async () => {
                                    setModBusy(true);
                                    try {
                                        if (moderationOpen === 'report') {
                                            await reportPost(post.id, reasonCode, details, accessToken ?? undefined);
                                            setToast('Report submitted');
                                        } else if (moderationOpen === 'ban') {
                                            await banUser(post.authorUserId, details || 'Violation of community rules', accessToken ?? undefined);
                                            setToast('User banned');
                                        } else {
                                            await unbanUser(post.authorUserId, accessToken ?? undefined, details || undefined);
                                            setToast('User unbanned');
                                        }

                                        setModerationOpen(null);
                                        setDetails('');
                                        onRefresh?.();
                                    } catch (err) {
                                        setToast('Unable to complete moderation action. Please try again.');
                                    } finally {
                                        setModBusy(false);
                                    }
                                }}
                            >
                                {moderationOpen === 'report' ? 'Submit report' : moderationOpen === 'ban' ? 'Ban user' : 'Unban user'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </article>
    );
}
