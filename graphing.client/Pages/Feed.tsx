import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PostSummary } from '../src/features/posts/postsApi';

export default function Feed() {
    const [posts, setPosts] = useState<PostSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch('/api/posts');
                if (!res.ok) throw new Error(await res.text() || res.statusText);
                const data = await res.json();
                setPosts(data);
            } catch (err: any) {
                setError(err?.message || 'Unable to load feed');
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, []);

    return (
        <div>
            <h2>Feed</h2>
            {loading && <div>Loading...</div>}
            {error && <div style={{ color: 'red' }}>{error}</div>}
            {!loading && posts.length === 0 && <div>No posts yet.</div>}
            {posts.length > 0 && (
                <ul>
                    {posts.map((p) => (
                        <li key={p.id}>
                            <Link to={`/posts/${p.id}`}>{p.title ?? `Post ${p.id}`}</Link>
                            {' — '}
                            <strong>{p.authorName ?? 'Unknown'}</strong>
                            {' — '}
                            {new Date(p.createdAt).toLocaleString()}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
