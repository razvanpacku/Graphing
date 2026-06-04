import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthSession } from '../auth';
import { createPost } from './postsApi';
import type { CreatePostRequest } from './postsApi';
import { resolveSceneAssetUrl } from '../scenes/sceneAssetUrl';

export default function PublishModal({
    open,
    onClose,
    sceneVersionId,
    initialTitle,
    initialDescription,
    thumbnailPath
}: {
    open: boolean;
    onClose: () => void;
    sceneVersionId: string | null;
    initialTitle?: string | null;
    initialDescription?: string | null;
    thumbnailPath?: string | null;
}) {
    const navigate = useNavigate();
    const { accessToken } = useAuthSession();
    const [title, setTitle] = useState(initialTitle ?? '');
    const [description, setDescription] = useState(initialDescription ?? '');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sceneVersionId) return setError('No scene version selected');
        setSubmitting(true);
        setError(null);
        try {
            const req: CreatePostRequest = { sceneVersionId: sceneVersionId, title: title || 'Untitled', description: description || undefined, thumbnailPath: thumbnailPath || undefined };
            const res = await createPost(req, accessToken ?? undefined);
            // navigate to new post
            navigate(`/posts/${res.id}`);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Publish failed');
        } finally {
            setSubmitting(false);
        }
    };
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
            <form onSubmit={handleSubmit} className="publish-modal-form scene-detail__panel" style={{ background: 'white', padding: 20, borderRadius: 8, position: 'relative' }}>
                <div className="auth-dialog-header" style={{ marginBottom: 14 }}>
                    <div>
                        <p className="scene-kicker">Publish post</p>
                        <h3 style={{ margin: 0 }}>Publish Scene</h3>
                    </div>
                    <button className="icon-button" type="button" onClick={onClose} aria-label="Close publish dialog" disabled={submitting}>
                        ×
                    </button>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    {thumbnailPath ? (
                        <img className="publish-modal-thumbnail" src={resolveSceneAssetUrl(thumbnailPath) ?? undefined} alt="thumbnail" />
                    ) : (
                        <div className="publish-modal-thumbnail" />
                    )}
                    <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: 8 }}>
                            <label style={{ display: 'block', fontSize: 12 }}>Title</label>
                            <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                        </div>
                        <div style={{ marginBottom: 8 }}>
                            <label style={{ display: 'block', fontSize: 12 }}>Description</label>
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                        </div>
                    </div>
                </div>
                {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
                <div className="publish-modal-actions">
                    <button className="scene-button scene-button--secondary" type="button" onClick={onClose} disabled={submitting}>Cancel</button>
                    <button className="nav-button" type="submit" disabled={submitting || !sceneVersionId}>{submitting ? 'Publishing...' : 'Publish'}</button>
                </div>
            </form>
        </div>
    );
}
