import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import GraphingCalculator3D from '../Components/GraphingCalculator3D';
import type { GraphSceneHandle } from '../Components/GraphingCalculator3D';
import { useAuthSession } from '../src/features/auth';
import { fetchScene } from '../src/features/scenes/scenesApi';

function Home() {
    const ref = useRef<GraphSceneHandle | null>(null);
    const [searchParams] = useSearchParams();
    const loadSceneId = searchParams.get('loadSceneId');
    const { accessToken, isRestoring } = useAuthSession();
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        if (!loadSceneId || isRestoring) return;

        (async () => {
            try {
                setLoadError(null);
                const scene = await fetchScene(loadSceneId, accessToken ?? undefined);
                let snapshot = scene.sceneJson;
                if (typeof snapshot === 'string') {
                    snapshot = JSON.parse(snapshot);
                }
                ref.current?.loadScene(snapshot, {
                    title: scene.title ?? '',
                    description: scene.description ?? '',
                    sceneId: scene.id,
                    thumbnailPath: scene.thumbnailPath ?? null
                });
            } catch (e) {
                setLoadError(e instanceof Error ? e.message : 'Unable to load the scene.');
            }
        })();
    }, [accessToken, isRestoring, loadSceneId]);

    return (
        <>
            {loadError && <div className="scene-load-toast scene-toast scene-toast--error">{loadError}</div>}
            <GraphingCalculator3D ref={ref} />
        </>
    );
}

export default Home;