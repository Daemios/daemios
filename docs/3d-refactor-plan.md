# 3D Engine Refactor Plan

## Module Graph
```
3d/core/
  SceneController -> orchestrates renderer loop
  RenderPipeline -> builds WebGL renderer and post FX
  Assets/AssetStore -> async asset cache
  Cameras/* -> reusable camera rigs
  Interact/Interactor -> pointer to intent bridge
  Culling/* -> LOD & frustum hooks

3d/grids/
  Grid (interface)
  HexGrid
  SquareGrid
  CoordConverters/*

3d/nav/
  Nav (interface)
  HexNav
  SquareNav

worldmap/WorldMapScene -> SceneController + HexGrid + HexNav
arena/ArenaScene -> SceneController + SquareGrid + SquareNav
```

## Public Interfaces
```ts
// Grid
interface Grid {
  toWorld(coord: Vec2): Vec3;
  toCoord(world: Vec3): Vec2;
  neighbors(coord: Vec2): Vec2[];
  distance(a: Vec2, b: Vec2): number;
  ring(center: Vec2, radius: number): Vec2[];
  spiral(center: Vec2, radius: number): Vec2[];
  raycastTileLine(a: Vec2, b: Vec2): Vec2[];
}

// Nav
interface Nav {
  pathfind(start: Vec2, end: Vec2): Vec2[];
  costMap(start: Vec2, max: number): Map<string, number>;
  isBlocked(coord: Vec2): boolean;
}

// SceneController
interface SceneController {
  init(): Promise<void>;
  mount(el: HTMLElement): void;
  tick(dt: number): void;
  resize(w: number, h: number): void;
  dispose(): void;
}

// RenderPipeline
interface RenderPipeline {
  createRenderer(opts?: object): WebGLRenderer;
  addPass(pass: object): void;
  setCulling(fn: (object3d) => boolean): void;
}

// AssetStore
interface AssetStore {
  load(key: string, loader: () => Promise<any>): Promise<any>;
  release(key: string): void;
  purge(): void;
}

// Interactor
interface Interactor {
  attach(dom: HTMLElement): void;
  detach(): void;
  on(type: string, fn: (intent: any) => void): void;
}
```

## Folder Layout
```
/3d/core/
  SceneController.js
  RenderPipeline.js
  Cameras/
  Assets/AssetStore.js
  Culling/
  Interact/Interactor.js
/3d/grids/
  Grid.js
  HexGrid.js
  SquareGrid.js
  CoordConverters/
/3d/nav/
  Nav.js
  HexNav.js
  SquareNav.js
/worldmap/WorldMapScene.js
/worldmap/generators/
/arena/ArenaScene.js
/arena/spawners/
/ui/overlays/
```

## Abstraction Rules
- Domain layers use simple `{x:number,y:number,z?:number}` DTOs; Three.js types stay inside the bridge layer.
- Grid APIs expose `toWorld`, `toCoord`, `neighbors`, `distance`, `ring`, `spiral`, `raycastTileLine`.
- Cameras are preset profiles (`iso`, `free-orbit`, `tactics-topdown`).
- Scene mutations go through commands/events to allow undo and replay.

## Incremental Refactor Plan
1. Extract `SceneController` and `AssetStore` from world map.
2. Introduce `Grid` interface; adapt existing hex logic into `HexGrid`.
3. Introduce `Nav` interface; wrap current pathfinding as `HexNav`.
4. Build `ArenaScene` using core + stub `SquareGrid`/`SquareNav`.
5. Move input to `Interactor`; unify pointer→tile picking via grid adapters.
6. Add culling/LOD hooks; split heavy jobs into cancellable workers.

## Test Plan
- Golden image snapshots for render sanity.
- Coord round-trip tests (`coord -> world -> coord`).
- Neighbor and path invariants across grid types.
- Fixture scenes to validate camera controls.
- Tick budget profiling to stay within 16ms.

## Risk Log & Mitigations
- Float precision differences between hex axial and cartesian → keep math in domain DTOs and centralize converters.
- Scene disposal leaks → `AssetStore` reference counts and `SceneController.dispose` clear resources.
- Worker churn from chunked tasks → backpressure queue to limit concurrent jobs.

## Optimization Hooks
- Frustum culling and LOD callbacks in `RenderPipeline`.
- Tile-batch instancing utilities.
- Impostor/LOD levels per asset.
- Async chunk generation with cancellation and queue backpressure.
```
