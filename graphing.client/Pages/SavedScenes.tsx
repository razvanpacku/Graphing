import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthSession } from '../src/features/auth';
import type { SceneSummary, PagedResult } from '../src/features/scenes/scenesApi';
import { clearPersistedSceneContext, fetchUserScenes, deleteScene } from '../src/features/scenes/scenesApi';
import { resolveSceneAssetUrl } from '../src/features/scenes/sceneAssetUrl';

const visibilityLabels: Record<number, string> = {
    0: 'Private',
    1: 'Unlisted',
    2: 'Published'
};

export default function SavedScenes() {
    const { accessToken, isRestoring, currentUser } = useAuthSession();
    const [scenes, setScenes] = useState<SceneSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [pendingDelete, setPendingDelete] = useState<SceneSummary | null>(null);
    const pageSize = 10;

    useEffect(() => {
        if (isRestoring) return;
        if (!currentUser) return;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchUserScenes(page, pageSize, accessToken ?? undefined) as PagedResult<SceneSummary>;
                setScenes(data.items);
                setTotal(data.total);
            } catch (err: any) {
                setError(err?.message || 'Unable to load scenes');
            } finally {
                setLoading(false);
            }
        };

        void load();
    }, [accessToken, currentUser, isRestoring, page]);

    useEffect(() => {
        setPage(1);
    }, [currentUser]);

    if (isRestoring) return <div>Restoring session...</div>;
    if (!currentUser) return <div>Please sign in to view your saved scenes.</div>;

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return (
        <section className="scene-page scene-page--wide">
            <header className="scene-page__header">
                <div>
                    <p className="scene-kicker">Private workspace</p>
                    <h2 className="scene-title">My Scenes</h2>
                    <p className="scene-subtitle">Open a scene to inspect it, or delete scenes you no longer need.</p>
                </div>
                <div className="scene-page__header-actions">
                    <span className="scene-count">{total} saved</span>
                </div>
            </header>

            {loading && <div className="scene-empty-state">Loading your scenes...</div>}
            {error && <div className="scene-toast scene-toast--error">{error}</div>}
            {!loading && scenes.length === 0 && (
                <div className="scene-empty-state">
                    <h3>No saved scenes yet</h3>
                    <p>Save a scene from the editor and it will appear here for editing and reuse.</p>
                </div>
            )}

            {scenes.length > 0 && (
                <div className="scene-list">
                    {scenes.map((scene) => (
                        <article className="scene-card" key={scene.id}>
                            <div className="scene-card__thumbnail">
                                {resolveSceneAssetUrl(scene.thumbnailPath) ? (
                                    <img src={resolveSceneAssetUrl(scene.thumbnailPath) ?? undefined} alt={scene.title ?? 'Scene thumbnail'} />
                                ) : (
                                    <div className="scene-card__thumbnail-placeholder">No preview</div>
                                )}
                            </div>
                            <div className="scene-card__body">
                                <div className="scene-card__title-row">
                                    <Link className="scene-card__title" to={`/scenes/${scene.id}`}>
                                        {scene.title ?? `Scene ${scene.id}`}
                                    </Link>
                                    <span className="scene-badge scene-badge--private">{visibilityLabels[scene.visibility] ?? 'Private'}</span>
                                </div>
                                <div className="scene-card__meta">
                                    <span>Created {new Date(scene.createdAt).toLocaleString()}</span>
                                    <span>Updated {new Date(scene.updatedAt).toLocaleString()}</span>
                                    {scene.canEdit && <span>Editable</span>}
                                </div>
                            </div>
                            <div className="scene-card__actions">
                                <Link className="scene-button scene-button--secondary" to={`/scenes/${scene.id}`}>Open</Link>
                                <button
                                    className="scene-button scene-button--danger"
                                    type="button"
                                    onClick={() => setPendingDelete(scene)}
                                >
                                    Delete
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            <div className="scene-pagination">
                <button className="scene-button scene-button--secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
                <span className="scene-pagination__status">Page {page} of {totalPages}</span>
                <button className="scene-button scene-button--secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>

            {pendingDelete && (
                <div className="scene-modal-backdrop" role="presentation" onClick={() => setPendingDelete(null)}>
                    <div className="scene-modal" role="dialog" aria-modal="true" aria-labelledby="delete-scene-title" onClick={(event) => event.stopPropagation()}>
                        <p className="scene-kicker">Confirm delete</p>
                        <h3 id="delete-scene-title">Delete {pendingDelete.title ?? `Scene ${pendingDelete.id}` }?</h3>
                        <p>This removes the scene from your library. The saved image and draft data will be deleted too.</p>
                        <div className="scene-modal__actions">
                            <button className="scene-button scene-button--secondary" type="button" onClick={() => setPendingDelete(null)}>Cancel</button>
                            <button
                                className="scene-button scene-button--danger"
                                type="button"
                                onClick={async () => {
                                    const scene = pendingDelete;
                                    setPendingDelete(null);

                                    try {
                                        await deleteScene(scene.id, accessToken ?? undefined);
                                        clearPersistedSceneContext(scene.id);
                                        setScenes((cur) => {
                                            const next = cur.filter((entry) => entry.id !== scene.id);
                                            if (next.length === 0 && page > 1) {
                                                setPage((currentPage) => Math.max(1, currentPage - 1));
                                            }

                                            return next;
                                        });
                                        setTotal((count) => Math.max(0, count - 1));
                                    } catch (e: any) {
                                        setError(e?.message || 'Unable to delete scene');
                                    }
                                }}
                            >
                                Delete scene
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
