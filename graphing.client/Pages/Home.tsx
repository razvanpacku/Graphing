import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import GraphingCalculator3D from '../Components/GraphingCalculator3D';
import type { GraphSceneHandle } from '../Components/GraphingCalculator3D';
import { useAuthSession } from '../src/features/auth';
import { fetchScene } from '../src/features/scenes/scenesApi';
import { fetchPostScene } from '../src/features/posts/postsApi';

function Home() {
    const ref = useRef<GraphSceneHandle | null>(null);
    const [searchParams] = useSearchParams();
    const loadSceneId = searchParams.get('loadSceneId');
    const loadPostId = searchParams.get('loadPostId');
    const fork = searchParams.get('fork') === '1';
    const { accessToken, isRestoring } = useAuthSession();
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        if ((!loadSceneId && !loadPostId) || isRestoring) return;

        (async () => {
            try {
                setLoadError(null);
                const payload = loadPostId
                    ? await fetchPostScene(loadPostId, accessToken ?? undefined)
                    : await fetchScene(loadSceneId!, accessToken ?? undefined);

                let snapshot = payload.sceneJson;
                if (typeof snapshot === 'string') {
                    snapshot = JSON.parse(snapshot);
                }
                ref.current?.loadScene(snapshot, {
                    title: payload.title ?? '',
                    description: payload.description ?? '',
                    sceneId: loadPostId && fork ? null : ('sceneId' in payload ? payload.sceneId : loadSceneId),
                    thumbnailPath: payload.thumbnailPath ?? null
                });
            } catch (e) {
                setLoadError(e instanceof Error ? e.message : 'Unable to load the scene.');
            }
        })();
    }, [accessToken, isRestoring, loadSceneId, loadPostId, fork]);

    return (
        <>
            {loadError && <div className="scene-load-toast scene-toast scene-toast--error">{loadError}</div>}
            <GraphingCalculator3D ref={ref} />
        </>
    );
}

export default Home;