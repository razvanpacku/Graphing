declare module "isosurface" {
    export function surfaceNets(
        dims: [number, number, number],
        potential: (x: number, y: number, z: number) => number,
        bounds?: [[number, number, number], [number, number, number]],
    ): {
        positions: number[][];
        cells: number[][];
    };

    export function marchingCubes(
        dims: [number, number, number],
        potential: (x: number, y: number, z: number) => number,
        bounds?: [[number, number, number], [number, number, number]],
    ): {
        positions: number[][];
        cells: number[][];
    };

    export function marchingTetrahedra(
        dims: [number, number, number],
        potential: (x: number, y: number, z: number) => number,
        bounds?: [[number, number, number], [number, number, number]],
    ): {
        positions: number[][];
        cells: number[][];
    };
}