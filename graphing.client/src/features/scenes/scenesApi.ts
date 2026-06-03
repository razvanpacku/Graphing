export type SceneSummary = {
    id: string;
    title?: string | null;
    visibility: number;
    thumbnailPath?: string | null;
    createdAt: string;
    updatedAt: string;
    canEdit: boolean;
};

export type SceneDetail = {
    id: string;
    title?: string | null;
    description?: string | null;
    visibility: number;
    canEdit: boolean;
    thumbnailPath?: string | null;
    sceneJson: any;
    cameraJson: any;
    createdAt: string;
    updatedAt: string;
    versions?: Array<{ id: string; versionNumber: number; createdAt: string }>;
};

export type SceneSaveResponse = {
    id: string;
    thumbnailPath?: string | null;
    title?: string | null;
    description?: string | null;
    updatedAtUtc: string;
};

export class SceneRequestError extends Error {
    status: number;
    details?: unknown;

    constructor(message: string, status: number, details?: unknown) {
        super(message);
        this.name = 'SceneRequestError';
        this.status = status;
        this.details = details;
    }
}

const editorDraftStorageKey = 'graphing.editor.draft.v2';

const jsonHeaders = (accessToken?: string) => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
});

export type PagedResult<T> = { items: T[]; total: number };

export async function fetchUserScenes(page = 1, pageSize = 10, accessToken?: string): Promise<PagedResult<SceneSummary>> {
    const qs = new URLSearchParams({ ownerOnly: 'true', page: String(page), pageSize: String(pageSize) });
    const res = await fetch(`/api/scenes?${qs.toString()}`, { headers: jsonHeaders(accessToken) });
    return readJson<PagedResult<SceneSummary>>(res);
}

export async function fetchScene(id: string, accessToken?: string): Promise<SceneDetail> {
    const res = await fetch(`/api/scenes/${id}`, { headers: jsonHeaders(accessToken) });
    return readJson<SceneDetail>(res);
}

export async function saveScene(payload: SaveScenePayload, accessToken?: string): Promise<SceneSaveResponse> {
    const res = await fetch('/api/scenes', {
        method: 'POST',
        headers: jsonHeaders(accessToken),
        body: JSON.stringify(payload)
    });
    return readJson<SceneSaveResponse>(res);
}

export async function updateScene(id: string, payload: SaveScenePayload, accessToken?: string): Promise<SceneSaveResponse> {
    const res = await fetch(`/api/scenes/${id}`, { method: 'PUT', headers: jsonHeaders(accessToken), body: JSON.stringify(payload) });
    return readJson<SceneSaveResponse>(res);
}

export type SaveScenePayload = {
    title: string;
    description?: string | null;
    sceneJson: string;
    cameraJson: string;
    visibility: number;
    thumbnailDataUrl?: string | null;
};

export async function deleteScene(id: string, accessToken?: string): Promise<void> {
    const res = await fetch(`/api/scenes/${id}`, { method: 'DELETE', headers: jsonHeaders(accessToken) });
    await readJson<void>(res);
}

export function clearPersistedSceneContext(sceneId?: string | null): void {
    if (typeof window === 'undefined') {
        return;
    }

    const raw = window.localStorage.getItem(editorDraftStorageKey);
    if (!raw) {
        return;
    }

    try {
        const parsed = JSON.parse(raw) as { sceneId?: string | null; thumbnailPath?: string | null; dirty?: boolean };
        if (sceneId && parsed.sceneId !== sceneId) {
            return;
        }

        parsed.sceneId = null;
        parsed.thumbnailPath = null;
        parsed.dirty = false;
        window.localStorage.setItem(editorDraftStorageKey, JSON.stringify(parsed));
    } catch {
        window.localStorage.removeItem(editorDraftStorageKey);
    }
}

async function readJson<T>(response: Response): Promise<T> {
    const text = await response.text();

    if (!response.ok) {
        let details: unknown;

        try {
            details = text ? JSON.parse(text) : undefined;
        } catch {
            details = text;
        }

        throw new SceneRequestError(text || response.statusText || 'Request failed.', response.status, details);
    }

    if (!text) {
        return undefined as T;
    }

    try {
        return JSON.parse(text) as T;
    } catch (error) {
        throw new SceneRequestError('Failed to parse the server response.', response.status, text);
    }
}
