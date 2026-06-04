import { useEffect, useState } from 'react';
import FeedCard from '../src/features/posts/FeedCard';
import type { PostSummary, PagedResult } from '../src/features/posts/postsApi';
import { fetchPosts } from '../src/features/posts/postsApi';
import { useAuthSession } from '../src/features/auth';
import SignedOutState from '../src/Components/SignedOutState';

type FeedSortMode = 'newest' | 'popular';
type PopularWindowMode = 'all' | 'month' | 'week' | 'day';

export default function Feed() {
    const { accessToken, isRestoring, currentUser } = useAuthSession();
    const [posts, setPosts] = useState<PostSummary[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [sortMode, setSortMode] = useState<FeedSortMode>('newest');
    const [windowMode, setWindowMode] = useState<PopularWindowMode>('all');

    useEffect(() => {
        const timeout = window.setTimeout(() => setSearch(searchInput.trim()), 300);
        return () => window.clearTimeout(timeout);
    }, [searchInput]);

    const load = async (p = 1, replace = true) => {
        setLoading(true);
        setError(null);
        try {
            const res: PagedResult<PostSummary> = await fetchPosts(p, 10, accessToken ?? undefined, {
                search: search || undefined,
                sort: sortMode,
                window: windowMode
            });
            if (replace || p === 1) setPosts(res.items);
            else setPosts((prev) => [...prev, ...res.items]);
            setTotal(res.total);
            setPage(p);
        } catch (err: any) {
            setError(err?.message || 'Unable to load feed');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isRestoring) return;
        if (!currentUser) {
            setPosts([]);
            setTotal(0);
            setPage(1);
            setLoading(false);
            return;
        }
        void load(1);
    }, [accessToken, isRestoring, currentUser, search, sortMode, windowMode]);

    if (isRestoring) return <div>Restoring session...</div>;

    if (!currentUser) {
        return (
            <section className="scene-page scene-page--wide">
                <header className="scene-page__header">
                    <div>
                        <p className="scene-kicker">Public feed</p>
                        <h2 className="scene-title">Posts</h2>
                        <p className="scene-subtitle">Browse published scenes and jump into the details.</p>
                    </div>
                </header>
                <SignedOutState title="You are signed out" description="Sign in again to access the feed and interact with posts." />
            </section>
        );
    }

    return (
        <section className="scene-page scene-page--wide">
            <header className="scene-page__header">
                <div>
                    <p className="scene-kicker">Public feed</p>
                    <h2 className="scene-title">Posts</h2>
                    <p className="scene-subtitle">Browse published scenes and jump into the details.</p>
                </div>
                <div className="scene-page__header-actions">
                    <span className="scene-count">{total} posts</span>
                </div>
            </header>

            <div className="feed-toolbar scene-detail__panel">
                <label className="feed-toolbar__field">
                    <span>Search</span>
                    <input
                        className="feed-toolbar__input"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search titles, descriptions, or authors"
                    />
                </label>
                <label className="feed-toolbar__field">
                    <span>Sort</span>
                    <select value={sortMode} onChange={(e) => setSortMode(e.target.value as FeedSortMode)}>
                        <option value="newest">Newest to oldest</option>
                        <option value="popular">Most popular</option>
                    </select>
                </label>
                {sortMode === 'popular' ? (
                    <label className="feed-toolbar__field">
                        <span>Window</span>
                        <select value={windowMode} onChange={(e) => setWindowMode(e.target.value as PopularWindowMode)}>
                            <option value="all">All time</option>
                            <option value="month">This month</option>
                            <option value="week">This week</option>
                            <option value="day">Today</option>
                        </select>
                    </label>
                ) : null}
                <div className="feed-toolbar__meta">
                    <span>{loading ? 'Loading…' : `${posts.length} shown`}</span>
                    {search ? <span>Filtered by “{search}”</span> : null}
                </div>
            </div>

            {loading && <div className="scene-empty-state">Loading feed...</div>}
            {error && <div className="scene-toast scene-toast--error">{error}</div>}
            {!loading && posts.length === 0 && <div className="scene-empty-state"><h3>No posts yet</h3><p>Publish a scene to populate the feed.</p></div>}
            {posts.length > 0 && (
                <div className="scene-list">
                    {posts.map((p) => (
                        <FeedCard key={p.id} post={p} accessToken={accessToken ?? undefined} />
                    ))}
                </div>
            )}
            {posts.length < total && (
                <div className="scene-pagination">
                    <button className="scene-button scene-button--secondary" onClick={() => void load(page + 1, false)} disabled={loading}>Load more</button>
                </div>
            )}
        </section>
    );
}
