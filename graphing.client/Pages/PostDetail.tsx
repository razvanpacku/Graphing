import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthSession } from '../src/features/auth';
import { fetchPost, likePost, addComment } from '../src/features/posts/postsApi';
import type { PostDetail as PostDetailType } from '../src/features/posts/postsApi';

export default function PostDetail() {
    const { id } = useParams<{ id: string }>();
    const { accessToken, currentUser, isRestoring } = useAuthSession();
    const [post, setPost] = useState<PostDetailType | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [commentBody, setCommentBody] = useState('');

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        setError(null);
        void fetchPost(Number(id), accessToken ?? undefined)
            .then((p) => setPost(p))
            .catch((e) => setError(e?.message || 'Unable to load post'))
            .finally(() => setLoading(false));
    }, [id, accessToken]);

    if (isRestoring) return <div>Restoring session...</div>;
    if (!id) return <div>Invalid post id.</div>;

    const onLike = async () => {
        if (!post) return;
        try {
            await likePost(post.id, accessToken ?? undefined);
            const refreshed = await fetchPost(post.id, accessToken ?? undefined);
            setPost(refreshed);
        } catch (e: any) {
            setError(e?.message || 'Unable to like post');
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
        } catch (e: any) {
            setError(e?.message || 'Unable to add comment');
        }
    };

    return (
        <div>
            {loading && <div>Loading post...</div>}
            {error && <div style={{ color: 'red' }}>{error}</div>}
            {post && (
                <article>
                    <h2>{post.title ?? `Post ${post.id}`}</h2>
                    <div>
                        <strong>{post.authorName ?? 'Unknown'}</strong>
                        {' • '}
                        {new Date(post.createdAt).toLocaleString()}
                    </div>
                    <section style={{ marginTop: '1rem' }}>{post.body}</section>

                    <div style={{ marginTop: '1rem' }}>
                        <button onClick={onLike} disabled={!currentUser}>
                            {post.liked ? 'Unlike' : 'Like'} ({post.likeCount ?? 0})
                        </button>
                    </div>

                    <section style={{ marginTop: '1.5rem' }}>
                        <h3>Comments</h3>
                        {(!post.comments || post.comments.length === 0) && <div>No comments yet.</div>}
                        <ul>
                            {post.comments?.map((c) => (
                                <li key={c.id}>
                                    <strong>{c.authorName ?? 'Anon'}</strong>
                                    {' • '}
                                    {new Date(c.createdAt).toLocaleString()}
                                    <div>{c.body}</div>
                                </li>
                            ))}
                        </ul>

                        {currentUser ? (
                            <form onSubmit={onAddComment} style={{ marginTop: '1rem' }}>
                                <textarea value={commentBody} onChange={(e) => setCommentBody(e.target.value)} rows={3} cols={60} />
                                <div>
                                    <button type="submit">Add comment</button>
                                </div>
                            </form>
                        ) : (
                            <div>Please sign in to comment.</div>
                        )}
                    </section>
                </article>
            )}
        </div>
    );
}
