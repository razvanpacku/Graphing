import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthSession } from '../src/features/auth';
import { fetchScene } from '../src/features/scenes/scenesApi';
import { resolveSceneAssetUrl } from '../src/features/scenes/sceneAssetUrl';
import PublishModal from '../src/features/posts/PublishModal';
import SignedOutState from '../src/Components/SignedOutState';

export default function SceneDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { accessToken, isRestoring, currentUser } = useAuthSession();
    const [scene, setScene] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [publishOpen, setPublishOpen] = useState(false);

    useEffect(() => {
        if (isRestoring) return;

        if (!currentUser) {
            setScene(null);
            setError(null);
            setLoading(false);
            setPublishOpen(false);
            return;
        }

        if (!id) return;

        setLoading(true);
        setError(null);
        fetchScene(id, accessToken ?? undefined)
            .then((s) => setScene(s))
            .catch((e) => setError(e?.message || 'Unable to load scene'))
            .finally(() => setLoading(false));
    }, [id, accessToken, currentUser, isRestoring]);

    if (isRestoring) return <div>Restoring session...</div>;
    if (!id) return <div>Invalid scene id.</div>;

    const onLoad = () => {
        navigate(`/?loadSceneId=${encodeURIComponent(id)}`);
    };

    return (
        <section className="scene-page scene-page--narrow">
            <header className="scene-page__header">
                <div>
                    <p className="scene-kicker">Scene details</p>
                    <h2 className="scene-title">{scene?.title ?? `Scene ${scene?.id ?? id}`}</h2>
                    {scene && <p className="scene-subtitle">Saved {new Date(scene.createdAt).toLocaleString()}</p>}
                </div>
            </header>

            {loading && <div className="scene-empty-state">Loading scene...</div>}
            {error && <div className="scene-toast scene-toast--error">{error}</div>}

            {!currentUser && !loading && !scene ? (
                <SignedOutState title="You are signed out" description="Sign in again to view and edit your saved scene details." />
            ) : null}

            {scene && (
                <div className="scene-detail">
                    <div className="scene-detail__panel">
                            <div className="scene-detail__thumbnail">
                                {resolveSceneAssetUrl(scene.thumbnailPath) ? (
                                    <img src={resolveSceneAssetUrl(scene.thumbnailPath) ?? undefined} alt={scene.title ?? 'Scene thumbnail'} />
                                ) : (
                                    <div className="scene-detail__thumbnail-placeholder">No thumbnail saved yet</div>
                                )}
                            </div>
                        <div className="scene-detail__row">
                            <span className="scene-detail__label">Created</span>
                            <span>{new Date(scene.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="scene-detail__row">
                            <span className="scene-detail__label">Updated</span>
                            <span>{new Date(scene.updatedAt).toLocaleString()}</span>
                        </div>
                        <div className="scene-detail__row">
                            <span className="scene-detail__label">Permissions</span>
                            <span>{scene.canEdit ? 'You can edit this scene' : 'View only'}</span>
                        </div>

                            <div className="scene-detail__actions">
                                <button className="scene-button" type="button" onClick={onLoad}>Load into editor</button>
                                {scene?.canEdit && (
                                    <button className="scene-button" type="button" onClick={() => setPublishOpen(true)}>Publish</button>
                                )}
                            </div>
                    </div>

                    <div className="scene-detail__panel scene-detail__panel--code">
                        <h3>Snapshot</h3>
                        <pre>{JSON.stringify(scene, null, 2)}</pre>
                    </div>
                </div>
            )}
            <PublishModal open={publishOpen} onClose={() => setPublishOpen(false)} sceneVersionId={scene?.versions && scene.versions.length > 0 ? scene.versions.reduce((a: any, b: any) => (a.versionNumber > b.versionNumber ? a : b)).id : null} initialTitle={scene?.title} initialDescription={scene?.description} thumbnailPath={scene?.thumbnailPath} />
        </section>
    );
}
