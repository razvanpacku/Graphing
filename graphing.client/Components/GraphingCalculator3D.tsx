import { forwardRef, useEffect, useImperativeHandle, useMemo, useReducer, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { compile } from "mathjs";
import * as isosurface from "isosurface";

import "./GraphingCalculator.css";

type GraphEquationType = "explicit" | "implicit" | "parametric";

type BaseEquation = {
    id: string;
    label: string;
    color: string;
    visible: boolean;
    expanded: boolean;
};

type ExplicitEquation = BaseEquation & {
    type: "explicit";
    expression: string;
};

type ImplicitEquation = BaseEquation & {
    type: "implicit";
    expression: string;
};

type ParametricEquation = BaseEquation & {
    type: "parametric";
    xExpression: string;
    yExpression: string;
    zExpression: string;
    uMin: number;
    uMax: number;
    vMin: number;
    vMax: number;
};

type GraphEquation = ExplicitEquation | ImplicitEquation | ParametricEquation;

type SurfaceMetrics = {
    extent: number;
    resolution: number;
    gridStep: number;
    minorStep: number;
    implicitResolution: number;
};

type CameraState = {
    position: [number, number, number];
    target: [number, number, number];
    up: [number, number, number];
    fov: number;
    near: number;
    far: number;
    zoom: number;
};

type GraphSceneSnapshot = {
    version: 1;
    equations: GraphEquation[];
    camera: CameraState;
};

type ThumbnailSnapshot = {
    mimeType: "image/png";
    dataUrl: string;
    width: number;
    height: number;
};

export type GraphSceneHandle = {
    captureScene: () => GraphSceneSnapshot;
    loadScene: (snapshot: GraphSceneSnapshot) => void;
    captureThumbnail: (size?: { width?: number; height?: number }) => Promise<ThumbnailSnapshot>;
};

const DEFAULT_CAMERA_STATE: CameraState = {
    position: [10, 9, 14],
    target: [0, 0, 0],
    up: [0, 0, 1],
    fov: 42,
    near: 0.1,
    far: 50000,
    zoom: 1,
};

const DEFAULT_EQUATIONS: GraphEquation[] = [];

function createId() {
    return globalThis.crypto?.randomUUID?.() ?? `eq-${Math.random().toString(36).slice(2, 10)}`;
}

function createEquation(type: GraphEquationType): GraphEquation {
    const id = createId();

    if (type === "explicit") {
        return {
            id,
            type,
            label: "Explicit surface",
            expression: "2 * sin(x * 0.7) * cos(y * 0.7)",
            color: "#7dd3fc",
            visible: true,
            expanded: true,
        };
    }

    if (type === "implicit") {
        return {
            id,
            type,
            label: "Implicit surface",
            expression: "x^2 + y^2 + z^2 - 9",
            color: "#f59e0b",
            visible: true,
            expanded: true,
        };
    }

    return {
        id,
        type,
        label: "Parametric surface",
        xExpression: "(2.4 + 0.75 * cos(v)) * cos(u)",
        yExpression: "(2.4 + 0.75 * cos(v)) * sin(u)",
        zExpression: "0.75 * sin(v)",
        uMin: 0,
        uMax: Math.PI * 2,
        vMin: 0,
        vMax: Math.PI * 2,
        color: "#34d399",
        visible: true,
        expanded: true,
    };
}

function cloneEquation(equation: GraphEquation): GraphEquation {
    return { ...equation };
}

function cloneCameraState(camera: CameraState): CameraState {
    return {
        position: [...camera.position] as [number, number, number],
        target: [...camera.target] as [number, number, number],
        up: [...camera.up] as [number, number, number],
        fov: camera.fov,
        near: camera.near,
        far: camera.far,
        zoom: camera.zoom,
    };
}

function equationsEqual(left: GraphEquation, right: GraphEquation) {
    if (left.type !== right.type) {
        return false;
    }

    if (
        left.id !== right.id ||
        left.label !== right.label ||
        left.color !== right.color ||
        left.visible !== right.visible ||
        left.expanded !== right.expanded
    ) {
        return false;
    }

    if (left.type === "explicit" && right.type === "explicit") {
        return left.expression === right.expression;
    }

    if (left.type === "implicit" && right.type === "implicit") {
        return left.expression === right.expression;
    }

    if (left.type === "parametric" && right.type === "parametric") {
        return (
            left.xExpression === right.xExpression &&
            left.yExpression === right.yExpression &&
            left.zExpression === right.zExpression &&
            left.uMin === right.uMin &&
            left.uMax === right.uMax &&
            left.vMin === right.vMin &&
            left.vMax === right.vMax
        );
    }

    return false;
}

function createSceneSnapshot(equations: GraphEquation[], camera: CameraState): GraphSceneSnapshot {
    return {
        version: 1,
        equations: equations.map(cloneEquation),
        camera: cloneCameraState(camera),
    };
}

function normalizeSceneSnapshot(snapshot: GraphSceneSnapshot): GraphSceneSnapshot {
    return {
        version: 1,
        equations: snapshot.equations.map(cloneEquation),
        camera: cloneCameraState(snapshot.camera),
    };
}

function toNumber(value: unknown) {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    const converted = Number(value);
    return Number.isFinite(converted) ? converted : null;
}

function describeError(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

function compileEquation(equation: GraphEquation) {
    try {
        if (equation.type === "explicit") {
            return { kind: "ok" as const, compiled: compile(equation.expression) };
        }

        if (equation.type === "implicit") {
            return { kind: "ok" as const, compiled: compile(equation.expression) };
        }

        return {
            kind: "ok" as const,
            compiledX: compile(equation.xExpression),
            compiledY: compile(equation.yExpression),
            compiledZ: compile(equation.zExpression),
        };
    } catch (error) {
        return { kind: "error" as const, message: describeError(error) };
    }
}

function niceStep(targetStep: number) {
    if (!Number.isFinite(targetStep) || targetStep <= 0) {
        return 1;
    }

    const exponent = Math.floor(Math.log10(targetStep));
    const base = targetStep / 10 ** exponent;
    const snapped = base < 1.5 ? 1 : base < 3.5 ? 2 : base < 7.5 ? 5 : 10;

    return snapped * 10 ** exponent;
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function buildVisibleMetrics(camera: THREE.PerspectiveCamera, size: { width: number; height: number }): SurfaceMetrics {
    const distance = camera.position.length();
    const verticalHalfSpan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * distance;
    const horizontalHalfSpan = verticalHalfSpan * (size.width / size.height);
    const extent = clamp(Math.max(verticalHalfSpan, horizontalHalfSpan) * 1.15, 4, 256);
    const resolution = clamp(Math.round(extent * 2.25), 28, 96);
    const gridStep = niceStep(extent / 8);

    return {
        extent,
        resolution,
        gridStep,
        minorStep: gridStep / 5,
        implicitResolution: clamp(Math.round(extent * 0.42), 28, 72),
    };
}

function useSurfaceMetrics() {
    const { camera, size } = useThree();
    const metricsRef = useRef<SurfaceMetrics>(buildVisibleMetrics(camera as THREE.PerspectiveCamera, size));
    const [metrics, setMetrics] = useState(metricsRef.current);

    useFrame(() => {
        const nextMetrics = buildVisibleMetrics(camera as THREE.PerspectiveCamera, size);
        const current = metricsRef.current;

        if (
            Math.abs(nextMetrics.extent - current.extent) > 0.15 ||
            nextMetrics.resolution !== current.resolution ||
            Math.abs(nextMetrics.gridStep - current.gridStep) > 0.05
        ) {
            metricsRef.current = nextMetrics;
            setMetrics(nextMetrics);
        }
    });

    return metrics;
}

function makeSurfaceGeometry(resolution: number, extent: number) {
    return new THREE.PlaneGeometry(extent * 2, extent * 2, resolution, resolution);
}

function surfaceToPositions(geometry: THREE.BufferGeometry) {
    return geometry.getAttribute("position") as THREE.BufferAttribute;
}

function buildExplicitGeometry(expression: any, metrics: SurfaceMetrics) {
    const geometry = makeSurfaceGeometry(metrics.resolution, metrics.extent);
    const positions = surfaceToPositions(geometry);
    const vertex = new THREE.Vector3();

    for (let index = 0; index < positions.count; index += 1) {
        vertex.fromBufferAttribute(positions, index);

        try {
            const zValue = toNumber(expression.evaluate({ x: vertex.x, y: vertex.y }));
            positions.setZ(index, zValue ?? Number.NaN);
        } catch {
            positions.setZ(index, Number.NaN);
        }
    }

    geometry.computeVertexNormals();
    return geometry;
}

function buildParametricGeometry(compiledX: any, compiledY: any, compiledZ: any, equation: ParametricEquation, metrics: SurfaceMetrics) {
    const geometry = makeSurfaceGeometry(metrics.resolution, metrics.extent);
    const positions = surfaceToPositions(geometry);
    const vertex = new THREE.Vector3();

    for (let index = 0; index < positions.count; index += 1) {
        vertex.fromBufferAttribute(positions, index);
        const u = THREE.MathUtils.mapLinear(vertex.x, -metrics.extent, metrics.extent, equation.uMin, equation.uMax);
        const v = THREE.MathUtils.mapLinear(vertex.y, -metrics.extent, metrics.extent, equation.vMin, equation.vMax);

        try {
            const nextX = toNumber(compiledX.evaluate({ u, v }));
            const nextY = toNumber(compiledY.evaluate({ u, v }));
            const nextZ = toNumber(compiledZ.evaluate({ u, v }));

            if (nextX === null || nextY === null || nextZ === null) {
                positions.setXYZ(index, Number.NaN, Number.NaN, Number.NaN);
                continue;
            }

            positions.setXYZ(index, nextX, nextY, nextZ);
        } catch {
            positions.setXYZ(index, Number.NaN, Number.NaN, Number.NaN);
        }
    }

    geometry.computeVertexNormals();
    return geometry;
}

function buildImplicitGeometry(expression: any, metrics: SurfaceMetrics) {
    const extent = metrics.extent;
    const resolution = metrics.implicitResolution;
    const bounds: [[number, number, number], [number, number, number]] = [
        [-extent, -extent, -extent],
        [extent, extent, extent],
    ];
    const fieldCache = new Map<string, number>();

    const sampleField = (x: number, y: number, z: number) => {
        const key = `${x.toFixed(5)}|${y.toFixed(5)}|${z.toFixed(5)}`;
        const cached = fieldCache.get(key);
        if (cached !== undefined) {
            return cached;
        }

        try {
            const value = toNumber(expression.evaluate({ x, y, z })) ?? Number.POSITIVE_INFINITY;
            fieldCache.set(key, value);
            return value;
        } catch {
            fieldCache.set(key, Number.POSITIVE_INFINITY);
            return Number.POSITIVE_INFINITY;
        }
    };

    const mesh = isosurface.marchingCubes([resolution, resolution, resolution], sampleField, bounds);
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(mesh.positions.flatMap((point: number[]) => point));
    const indices = new Uint32Array(mesh.cells.flatMap((cell: number[]) => cell));

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();
    return geometry;
}

function GraphGrid({ metrics }: { metrics: SurfaceMetrics }) {
    const half = metrics.extent;
    const startX = Math.floor(-half / metrics.gridStep) - 1;
    const endX = Math.ceil(half / metrics.gridStep) + 1;
    const startY = Math.floor(-half / metrics.gridStep) - 1;
    const endY = Math.ceil(half / metrics.gridStep) + 1;
    const startZ = Math.floor(-half / metrics.minorStep) - 1;
    const endZ = Math.ceil(half / metrics.minorStep) + 1;

    const majorLines = useMemo(() => {
        const lines: THREE.Vector3[][] = [];

        for (let index = startX; index <= endX; index += 1) {
            const x = index * metrics.gridStep;
            lines.push([new THREE.Vector3(x, -half, 0), new THREE.Vector3(x, half, 0)]);
        }

        for (let index = startY; index <= endY; index += 1) {
            const y = index * metrics.gridStep;
            lines.push([new THREE.Vector3(-half, y, 0), new THREE.Vector3(half, y, 0)]);
        }

        return lines;
    }, [endX, endY, half, metrics.gridStep, startX, startY]);

    const minorLines = useMemo(() => {
        const lines: THREE.Vector3[][] = [];

        for (let index = startX; index <= endX; index += 1) {
            const x = index * metrics.minorStep;
            if (Math.abs(x % metrics.gridStep) < metrics.minorStep * 0.15) {
                continue;
            }
            lines.push([new THREE.Vector3(x, -half, 0), new THREE.Vector3(x, half, 0)]);
        }

        for (let index = startY; index <= endY; index += 1) {
            const y = index * metrics.minorStep;
            if (Math.abs(y % metrics.gridStep) < metrics.minorStep * 0.15) {
                continue;
            }
            lines.push([new THREE.Vector3(-half, y, 0), new THREE.Vector3(half, y, 0)]);
        }

        return lines;
    }, [endX, endY, half, metrics.gridStep, metrics.minorStep, startX, startY]);

    const zTicks = useMemo(() => {
        const lines: THREE.Vector3[][] = [];

        for (let index = startZ; index <= endZ; index += 1) {
            const z = index * metrics.minorStep;
            if (Math.abs(z % metrics.gridStep) < metrics.minorStep * 0.15) {
                continue;
            }
            lines.push([new THREE.Vector3(0, 0, z), new THREE.Vector3(0.001, 0, z)]);
        }

        return lines;
    }, [endZ, metrics.gridStep, metrics.minorStep, startZ]);

    return (
        <group>
            {minorLines.map((points, index) => (
                <line key={`minor-${index}`}>
                    <bufferGeometry>
                        <bufferAttribute attach="attributes-position" args={[new Float32Array(points.flatMap((point) => [point.x, point.y, point.z])), 3]} />
                    </bufferGeometry>
                    <lineBasicMaterial color="#cfd9e6" transparent opacity={0.55} />
                </line>
            ))}
            {majorLines.map((points, index) => (
                <line key={`major-${index}`}>
                    <bufferGeometry>
                        <bufferAttribute attach="attributes-position" args={[new Float32Array(points.flatMap((point) => [point.x, point.y, point.z])), 3]} />
                    </bufferGeometry>
                    <lineBasicMaterial color="#8ea4bb" transparent opacity={0.88} />
                </line>
            ))}
            <lineSegments>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" args={[new Float32Array(zTicks.flatMap((segment) => segment.flatMap((point) => [point.x, point.y, point.z]))), 3]} />
                </bufferGeometry>
                <lineBasicMaterial color="#a4b6c7" transparent opacity={0.18} />
            </lineSegments>
        </group>
    );
}

function AxisHelpers() {
    return (
        <group>
            <line>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" args={[new Float32Array([-100, 0, 0, 100, 0, 0]), 3]} />
                </bufferGeometry>
                <lineBasicMaterial color="#3c5167" transparent opacity={0.95} />
            </line>
            <line>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" args={[new Float32Array([0, -100, 0, 0, 100, 0]), 3]} />
                </bufferGeometry>
                <lineBasicMaterial color="#3c5167" transparent opacity={0.95} />
            </line>
            <line>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" args={[new Float32Array([0, 0, -100, 0, 0, 100]), 3]} />
                </bufferGeometry>
                <lineBasicMaterial color="#3c5167" transparent opacity={0.95} />
            </line>
        </group>
    );
}

function CameraLinkedLight() {
    const { camera } = useThree();
    const lightRef = useRef<THREE.DirectionalLight>(null);
    const targetRef = useRef<THREE.Object3D>(null);

    useFrame(() => {
        const light = lightRef.current;
        const target = targetRef.current;

        if (!light || !target) {
            return;
        }

        light.position.copy(camera.position).add(new THREE.Vector3(4, 5, 6));
        target.position.set(0, 0, 0);
        light.target = target;
        light.lookAt(0, 0, 0);
        light.target.updateMatrixWorld();
    });

    return (
        <>
            <ambientLight intensity={0.75} />
            <hemisphereLight args={["#ffffff", "#dbe9f5", 0.72]} />
            <directionalLight ref={lightRef} color="#ffffff" intensity={1.9} castShadow />
            <object3D ref={targetRef} />
        </>
    );
}

function GraphScene({
    equations,
    cameraState,
    onCameraStateChange,
    onCanvasReady,
}: {
    equations: GraphEquation[];
    cameraState: CameraState;
    onCameraStateChange: (camera: CameraState) => void;
    onCanvasReady: (canvas: HTMLCanvasElement) => void;
}) {
    return (
        <Canvas
            camera={{ position: cameraState.position, fov: cameraState.fov, near: cameraState.near, far: cameraState.far }}
            className="graphing-stage__canvas"
            dpr={[1, 2]}
            gl={{ antialias: true, alpha: true }}
            onCreated={({ camera, gl, scene }) => {
                scene.up.set(0, 0, 1);
                const perspectiveCamera = camera as THREE.PerspectiveCamera;
                perspectiveCamera.up.set(...cameraState.up);
                perspectiveCamera.position.set(...cameraState.position);
                perspectiveCamera.fov = cameraState.fov;
                perspectiveCamera.near = cameraState.near;
                perspectiveCamera.far = cameraState.far;
                perspectiveCamera.zoom = cameraState.zoom;
                perspectiveCamera.updateProjectionMatrix();
                perspectiveCamera.lookAt(...cameraState.target);
                onCanvasReady(gl.domElement);
            }}
            shadows
        >
            <color attach="background" args={["#f7f9fd"]} />
            <GraphSceneContent equations={equations} cameraState={cameraState} onCameraStateChange={onCameraStateChange} />
        </Canvas>
    );
}

function GraphSceneContent({
    equations,
    cameraState,
    onCameraStateChange,
}: {
    equations: GraphEquation[];
    cameraState: CameraState;
    onCameraStateChange: (camera: CameraState) => void;
}) {
    const metrics = useSurfaceMetrics();
    const { camera } = useThree();
    const controlsRef = useRef<any>(null);

    useEffect(() => {
        const perspectiveCamera = camera as THREE.PerspectiveCamera;
        perspectiveCamera.position.set(...cameraState.position);
        perspectiveCamera.up.set(...cameraState.up);
        perspectiveCamera.fov = cameraState.fov;
        perspectiveCamera.near = cameraState.near;
        perspectiveCamera.far = cameraState.far;
        perspectiveCamera.zoom = cameraState.zoom;
        perspectiveCamera.updateProjectionMatrix();
        perspectiveCamera.lookAt(...cameraState.target);
        controlsRef.current?.target.set(...cameraState.target);
        controlsRef.current?.update();
    }, [camera, cameraState]);

    const captureCameraState = () => {
        const perspectiveCamera = camera as THREE.PerspectiveCamera;
        const controls = controlsRef.current;

        if (!controls) {
            return;
        }

        onCameraStateChange({
            position: [perspectiveCamera.position.x, perspectiveCamera.position.y, perspectiveCamera.position.z],
            target: [controls.target.x, controls.target.y, controls.target.z],
            up: [perspectiveCamera.up.x, perspectiveCamera.up.y, perspectiveCamera.up.z],
            fov: perspectiveCamera.fov,
            near: perspectiveCamera.near,
            far: perspectiveCamera.far,
            zoom: perspectiveCamera.zoom,
        });
    };

    return (
        <>
            <CameraLinkedLight />
            <GraphGrid metrics={metrics} />
            <AxisHelpers />
            {equations.map((equation) => (
                <SurfaceLayer key={equation.id} equation={equation} metrics={metrics} />
            ))}
            <OrbitControls
                ref={controlsRef}
                makeDefault
                enableRotate
                enablePan
                enableZoom
                enableDamping
                dampingFactor={0.08}
                zoomSpeed={0.8}
                minDistance={0.6}
                maxDistance={25000}
                target={[0, 0, 0]}
                onChange={captureCameraState}
            />
        </>
    );
}

function SurfaceLayer({ equation, metrics }: { equation: GraphEquation; metrics: SurfaceMetrics }) {
    const compilation = useMemo(() => compileEquation(equation), [equation]);

    const geometry = useMemo(() => {
        if (!equation.visible || compilation.kind === "error") {
            return null;
        }

        if (equation.type === "explicit") {
            return buildExplicitGeometry(compilation.compiled, metrics);
        }

        if (equation.type === "implicit") {
            return buildImplicitGeometry(compilation.compiled, metrics);
        }

        return buildParametricGeometry(compilation.compiledX, compilation.compiledY, compilation.compiledZ, equation, metrics);
    }, [compilation, equation, metrics]);

    useEffect(() => {
        return () => {
            geometry?.dispose();
        };
    }, [geometry]);

    if (!equation.visible) {
        return null;
    }

    if (compilation.kind === "error") {
        return null;
    }

    if (!geometry || geometry.getAttribute("position").count === 0) {
        return null;
    }

    return (
        <mesh geometry={geometry} castShadow receiveShadow>
            <meshPhongMaterial color={equation.color} specular="#ffffff" shininess={92} side={THREE.DoubleSide} />
        </mesh>
    );
}

function EquationCard({
    equation,
    onChange,
    onDelete,
}: {
    equation: GraphEquation;
    onChange: (equation: GraphEquation) => void;
    onDelete: (id: string) => void;
}) {
    const compilation = useMemo(() => compileEquation(equation), [equation]);

    const handleTypeChange = (type: GraphEquationType) => {
        const next = createEquation(type);

        onChange({
            ...next,
            id: equation.id,
            label: equation.label,
            color: equation.color,
            visible: equation.visible,
            expanded: true,
        });
    };

    const summaryExpression =
        equation.type === "explicit"
            ? equation.expression
            : equation.type === "implicit"
                ? equation.expression
                : `${equation.xExpression}, ${equation.yExpression}, ${equation.zExpression}`;

    return (
        <details className="equation-card" open={equation.expanded} onToggle={(event) => onChange({ ...equation, expanded: event.currentTarget.open })}>
            <summary>
                <div className="equation-summary__title">
                    <span className="equation-summary__label">{equation.label || "Equation"}</span>
                    <span className="equation-summary__expression">{summaryExpression}</span>
                </div>
                <div className="equation-summary__meta">
                    <span className="equation-pill">{equation.type}</span>
                    <span className="equation-dot" style={{ background: equation.color }} />
                </div>
            </summary>

            <div className="equation-body">
                <div className="equation-row">
                    <label className="equation-field">
                        <span>Label</span>
                        <input value={equation.label} onChange={(event) => onChange({ ...equation, label: event.target.value })} placeholder="Surface name" />
                    </label>
                    <label className="equation-field">
                        <span>Type</span>
                        <select value={equation.type} onChange={(event) => handleTypeChange(event.target.value as GraphEquationType)}>
                            <option value="explicit">Explicit</option>
                            <option value="implicit">Implicit</option>
                            <option value="parametric">Parametric</option>
                        </select>
                    </label>
                </div>

                {equation.type === "explicit" && (
                    <label className="equation-field">
                        <span>z = f(x, y)</span>
                        <textarea
                            value={equation.expression}
                            onChange={(event) => onChange({ ...equation, expression: event.target.value })}
                            placeholder="2 * sin(x) * cos(y)"
                        />
                    </label>
                )}

                {equation.type === "implicit" && (
                    <>
                        <label className="equation-field">
                            <span>F(x, y, z) = 0</span>
                            <textarea
                                value={equation.expression}
                                onChange={(event) => onChange({ ...equation, expression: event.target.value })}
                                placeholder="x^2 + y^2 + z^2 - 9"
                            />
                        </label>
                        <div className="equation-note">Implicit surfaces are extracted from a sampled scalar field and shaded with a Phong material.</div>
                    </>
                )}

                {equation.type === "parametric" && (
                    <>
                        <div className="equation-row equation-row--three">
                            <label className="equation-field">
                                <span>x(u, v)</span>
                                <input
                                    value={equation.xExpression}
                                    onChange={(event) => onChange({ ...equation, xExpression: event.target.value })}
                                    placeholder="cos(u) * (2 + cos(v))"
                                />
                            </label>
                            <label className="equation-field">
                                <span>y(u, v)</span>
                                <input
                                    value={equation.yExpression}
                                    onChange={(event) => onChange({ ...equation, yExpression: event.target.value })}
                                    placeholder="sin(u) * (2 + cos(v))"
                                />
                            </label>
                            <label className="equation-field">
                                <span>z(u, v)</span>
                                <input
                                    value={equation.zExpression}
                                    onChange={(event) => onChange({ ...equation, zExpression: event.target.value })}
                                    placeholder="sin(v)"
                                />
                            </label>
                        </div>
                        <div className="equation-row">
                            <label className="equation-field">
                                <span>u min</span>
                                <input type="number" value={equation.uMin} onChange={(event) => onChange({ ...equation, uMin: Number(event.target.value) })} />
                            </label>
                            <label className="equation-field">
                                <span>u max</span>
                                <input type="number" value={equation.uMax} onChange={(event) => onChange({ ...equation, uMax: Number(event.target.value) })} />
                            </label>
                            <label className="equation-field">
                                <span>v min</span>
                                <input type="number" value={equation.vMin} onChange={(event) => onChange({ ...equation, vMin: Number(event.target.value) })} />
                            </label>
                            <label className="equation-field">
                                <span>v max</span>
                                <input type="number" value={equation.vMax} onChange={(event) => onChange({ ...equation, vMax: Number(event.target.value) })} />
                            </label>
                        </div>
                    </>
                )}

                <label className="equation-field">
                    <span>Color</span>
                    <input type="color" value={equation.color} onChange={(event) => onChange({ ...equation, color: event.target.value })} />
                </label>

                <div className="equation-row">
                    <label className="equation-field">
                        <span>Visible</span>
                        <select
                            value={equation.visible ? "visible" : "hidden"}
                            onChange={(event) => onChange({ ...equation, visible: event.target.value === "visible" })}
                        >
                            <option value="visible">Visible</option>
                            <option value="hidden">Hidden</option>
                        </select>
                    </label>
                    <div className="equation-actions">
                        <button className="graphing-button graphing-button--ghost" type="button" onClick={() => onChange({ ...equation, expanded: !equation.expanded })}>
                            {equation.expanded ? "Collapse" : "Expand"}
                        </button>
                        <button className="equation-delete" type="button" onClick={() => onDelete(equation.id)}>
                            Delete
                        </button>
                    </div>
                </div>

                {compilation.kind === "error" && <div className="equation-error">{compilation.message}</div>}
            </div>
        </details>
    );
}

type UndoableState<T> = {
    past: T[];
    present: T;
    future: T[];
};

type UndoableAction<T> =
    | { type: "set"; value: T | ((current: T) => T) }
    | { type: "reset"; value: T }
    | { type: "undo" }
    | { type: "redo" };

function undoableReducer<T>(state: UndoableState<T>, action: UndoableAction<T>): UndoableState<T> {
    if (action.type === "set") {
        const nextValue = typeof action.value === "function"
            ? (action.value as (current: T) => T)(state.present)
            : action.value;

        if (Object.is(nextValue, state.present)) {
            return state;
        }

        return {
            past: [...state.past, state.present],
            present: nextValue,
            future: [],
        };
    }

    if (action.type === "reset") {
        return {
            past: [],
            present: action.value,
            future: [],
        };
    }

    if (action.type === "undo") {
        if (state.past.length === 0) {
            return state;
        }

        return {
            past: state.past.slice(0, -1),
            present: state.past[state.past.length - 1],
            future: [state.present, ...state.future],
        };
    }

    if (state.future.length === 0) {
        return state;
    }

    return {
        past: [...state.past, state.present],
        present: state.future[0],
        future: state.future.slice(1),
    };
}

function useUndoableState<T>(initialValue: T) {
    const [state, dispatch] = useReducer(undoableReducer<T>, {
        past: [],
        present: initialValue,
        future: [],
    });

    return {
        value: state.present,
        setValue: (nextValue: T | ((current: T) => T)) => dispatch({ type: "set", value: nextValue }),
        reset: (nextValue: T) => dispatch({ type: "reset", value: nextValue }),
        undo: () => dispatch({ type: "undo" }),
        redo: () => dispatch({ type: "redo" }),
        canUndo: state.past.length > 0,
        canRedo: state.future.length > 0,
    };
}

const GraphingCalculator3DContent = forwardRef<GraphSceneHandle, {}>(function GraphingCalculator3DContent(_props, ref) {
    const equationsState = useUndoableState<GraphEquation[]>(DEFAULT_EQUATIONS);
    const [cameraState, setCameraState] = useState<CameraState>(DEFAULT_CAMERA_STATE);
    const cameraSnapshotRef = useRef<CameraState>(DEFAULT_CAMERA_STATE);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const equations = equationsState.value;

    const updateEquation = (updatedEquation: GraphEquation) => {
        equationsState.setValue((current) => {
            let changed = false;
            const next = current.map((equation) => {
                if (equation.id !== updatedEquation.id) {
                    return equation;
                }

                if (equationsEqual(equation, updatedEquation)) {
                    return equation;
                }

                changed = true;
                return updatedEquation;
            });

            return changed ? next : current;
        });
    };

    const addEquation = (type: GraphEquationType) => {
        equationsState.setValue((current) => [createEquation(type), ...current]);
    };

    const deleteEquation = (id: string) => {
        equationsState.setValue((current) => current.filter((equation) => equation.id !== id));
    };

    const loadScene = (snapshot: GraphSceneSnapshot) => {
        const nextSnapshot = normalizeSceneSnapshot(snapshot);
        equationsState.reset(nextSnapshot.equations);
        cameraSnapshotRef.current = nextSnapshot.camera;
        setCameraState(nextSnapshot.camera);
    };

    useImperativeHandle(ref, () => ({
        captureScene: () => createSceneSnapshot(equations, cameraSnapshotRef.current),
        loadScene,
        captureThumbnail: async (size = {}) => {
            const canvas = canvasRef.current;

            if (!canvas) {
                throw new Error("Graph canvas is not ready yet.");
            }

            return {
                mimeType: "image/png",
                dataUrl: canvas.toDataURL("image/png"),
                width: size.width ?? canvas.width,
                height: size.height ?? canvas.height,
            };
        },
    }), [equations]);

    return (
        <div className="graphing-shell">
            <aside className="graphing-sidebar">
                <header className="graphing-sidebar__header">
                    <p className="graphing-kicker">Client-side 3D graph lab</p>
                    <h1 className="graphing-sidebar__title">Graphing Calculator</h1>
                    <p className="graphing-sidebar__subtitle">
                        Build explicit, implicit, and parametric 3D surfaces with orbit controls, zoom-aware grid scaling, and a Phong-lit viewport.
                    </p>
                    <div className="graphing-actions">
                        <button className="graphing-button" type="button" onClick={() => addEquation("explicit")}>
                            Add explicit
                        </button>
                        <button className="graphing-button" type="button" onClick={() => addEquation("implicit")}>
                            Add implicit
                        </button>
                        <button className="graphing-button" type="button" onClick={() => addEquation("parametric")}>
                            Add parametric
                        </button>
                    </div>
                    <div className="graphing-actions graphing-actions--history">
                        <button className="graphing-button graphing-button--ghost" type="button" onClick={equationsState.undo} disabled={!equationsState.canUndo}>
                            Undo
                        </button>
                        <button className="graphing-button graphing-button--ghost" type="button" onClick={equationsState.redo} disabled={!equationsState.canRedo}>
                            Redo
                        </button>
                    </div>
                </header>

                <div className="graphing-equations">
                    {equations.map((equation) => (
                        <EquationCard key={equation.id} equation={equation} onChange={updateEquation} onDelete={deleteEquation} />
                    ))}
                </div>
            </aside>

            <main className="graphing-stage">
                <GraphScene
                    equations={equations}
                    cameraState={cameraState}
                    onCameraStateChange={(nextCamera) => {
                        cameraSnapshotRef.current = nextCamera;
                    }}
                    onCanvasReady={(canvas) => {
                        canvasRef.current = canvas;
                    }}
                />
                <div className="graphing-overlay">
                    <div className="graphing-overlay__card">
                        <strong>Next step</strong>
                        Scene snapshots already include equations and camera state, so backend save/load can stay thin.
                    </div>
                    <div className="graphing-overlay__card">
                        <strong>Controls</strong>
                        Orbit to rotate, drag to pan, and scroll to zoom the full 3D scene.
                    </div>
                </div>
            </main>
        </div>
    );
});

const GraphingCalculator3D = GraphingCalculator3DContent;

export default GraphingCalculator3D;
