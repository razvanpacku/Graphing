export function resolveSceneAssetUrl(assetPath?: string | null): string | null {
    if (!assetPath) {
        return null;
    }

    if (/^https?:\/\//i.test(assetPath) || assetPath.startsWith('data:')) {
        return assetPath;
    }

    if (assetPath.startsWith('/')) {
        return assetPath;
    }

    return `/${assetPath.replace(/^\\+/, '').replace(/^\/+/, '')}`;
}
