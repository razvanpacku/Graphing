import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { PostSummary } from './postsApi';
import { likePost } from './postsApi';
import { resolveSceneAssetUrl } from '../scenes/sceneAssetUrl';

type FeedCardProps = {
    post: PostSummary;
    accessToken?: string;
    onLike?: (id: string) => void;
};

export default function FeedCard({ post, accessToken, onLike }: FeedCardProps) {
    const navigate = useNavigate();
    const [liking, setLiking] = useState(false);
    const [liked, setLiked] = useState(!!post.liked);
    const [count, setCount] = useState(post.likeCount ?? 0);
    const [toast, setToast] = useState<string | null>(null);

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
            console.warn('like failed', err);
            // revert
            setLiked(!nextLiked);
            setCount((c) => (nextLiked ? Math.max(0, c - 1) : c + 1));
            setToast('Unable to update like');
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
                <div className="feed-card-meta">{post.authorName ?? 'Unknown'}</div>
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
                </div>
                {toast ? <div className="scene-toast" style={{ marginTop: 10, marginBottom: 0 }}>{toast}</div> : null}
            </div>
        </article>
    );
}
