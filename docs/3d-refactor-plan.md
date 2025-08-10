# 3D Core Refactor

## 1. Module graph
```
3d/core
  ├─ SceneController ──> RenderPipeline ──> Three bridge
  ├─ AssetStore
  ├─ Interactor
  └─ Cameras / Culling / etc.
      ↑          ↑
      │          └──── hooks for LOD & frustum
      │
      └──── domain layers (grid, nav, generation, UI)

worldmap/WorldMapScene ──> HexGrid + HexNav
arena/ArenaScene ────────> SquareGrid + SquareNav
```

## 2. Public interfaces
```ts
// Grid.ts
interface Grid {
  toWorld(coord: Vec2): Vec3
  toCoord(world: Vec3): Vec2
  neighbors(coord: Vec2): Vec2[]
  distance(a: Vec2, b: Vec2): number
  ring(center: Vec2, radius: number): Vec2[]
  spiral(center: Vec2, radius: number): Vec2[]
  raycastTileLine(a: Vec2, b: Vec2): Vec2[]
}

// Nav.ts
interface Nav {
  pathfind(start: Vec2, goal: Vec2): Vec2[]
  cost(from: Vec2, to: Vec2): number
  setBlocker(coord: Vec2, blocked: boolean): void
}

// SceneController.ts
class SceneController {
  init(container: HTMLElement): void
  mount?(): void
  tick(dt: number): void
  resize(w: number, h: number): void
  dispose(): void
}

// RenderPipeline.ts
interface RenderPipeline {
  createRenderer(): WebGLRenderer
  render(r: WebGLRenderer, s: Scene, c: Camera, dt: number): void
  mount?(s: Scene, c: Camera, r: WebGLRenderer): void
  dispose?(): void
}

// AssetStore.ts
class AssetStore {
  load<T>(key: string, loader: (k: string) => Promise<T>): Promise<T>
  release(key: string): void
  clear(): void
}

// Interactor.ts
class Interactor {
  constructor(grid: Grid, dispatch: (intent: string, payload: any) => void)
  pointer(world: Vec3): void
}
```

## 3. Folder layout
```
/3d/core/
  SceneController.ts
  RenderPipeline.ts
  Cameras/
  Assets/AssetStore.ts
  Culling/
  Interact/Interactor.ts
/3d/grids/
  Grid.ts
  HexGrid.ts
  SquareGrid.ts
  CoordConverters/
/3d/nav/
  Nav.ts
  HexNav.ts
  SquareNav.ts
/worldmap/
  WorldMapScene.ts
  generators/
/arena/
  ArenaScene.ts
  spawners/
/ui/overlays/
```

## 4. Abstraction rules
- Domain uses plain `Vec2`/`Vec3` DTOs; Three.js objects stay inside core bridge.
- Grid adapters implement `toWorld`, `toCoord`, `neighbors`, `distance`, `ring`, `spiral`, `raycastTileLine`.
- Cameras provided as preset profiles (`iso`, `free-orbit`, `tactics-topdown`).
- Scene mutations happen through commands/events for future undo/replay support.

## 5. Incremental refactor plan
1. Extract `SceneController` and `AssetStore` from world map implementation.
2. Introduce `Grid` interface; move existing hex logic into `HexGrid`.
3. Introduce `Nav` interface; wrap current pathfinding as `HexNav`.
4. Build `ArenaScene` with shared core + stub `SquareGrid/SquareNav`.
5. Move input to `Interactor`; unify pointer→tile picking via grid adapters.
6. Add culling/LOD hooks; split heavy tasks into worker jobs.

## 6. Test plan
- Golden image snapshots for render sanity.
- Coordinate round‑trip: `coord → world → coord`.
- Neighbor and pathfinding invariants on small fixtures.
- Fixture scenes verifying camera controls.
- Perf budgets per tick measured in CI.

## 7. Risk log & mitigations
- Float precision differences between axial and cartesian grids → centralize converters, use `Vec` DTOs.
- Scene disposal leaks → `AssetStore` reference counting and `SceneController.dispose`.
- Worker job cancellation → expose abort handles on long‑running tasks.

## 8. Optimization hooks
- Frustum culling entry points in `RenderPipeline` and `Culling/` module.
- Tile batch instancing and LOD impostors.
- Async chunk generation with backpressure-aware job queue.
```
