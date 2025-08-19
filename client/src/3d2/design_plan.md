# 3D Module

# 3D Module

This file documents the proposed layering and folder layout for the three.js portion of the project. It intentionally separates pure domain logic from rendering and from framework integration.

## High-level layering

1. Domain / Game-logic layer

   - Pure TypeScript classes with zero three.js imports.
   - Responsibilities: world generation (WorldGrid), terrain/biome rules, navigation (HexNav, SquareNav), entity state, movement costs, and gameplay rules.
   - Success criteria: deterministic, testable, and runnable without a WebGL context.

2. Scene layer

   - Bridges domain -> rendering. Scene instances configure grid/nav/pipeline, assemble world-specific services (ChunkManager, ClutterManager, WaterManger), and expose a small API: init(), tick(dt), resize(w,h), dispose().
   - Examples: WorldMapScene, ArenaScene.

3. Rendering infrastructure layer

   - three.js–centric utilities shared across scenes: RenderPipeline implementations (deferred, post-process), AssetStore, instancing helpers, material builders, light/shadow utilities, high-performance chunk/geometry managers.

4. Interaction layer

   - Input controllers translating DOM/user events into scene or domain commands: orbit/zoom controllers, raycast selection, hover/drag, benchmark hooks.

5. Integration (Vue) layer

   - Very thin Vue components that create scene instances, pass stores/props, and run the render loop with requestAnimationFrame.
   - Responsibilities: lifecycle (mount/unmount), forwarding reactive store changes into domain/scene APIs.

6. Support utilities
   - Shared helpers (types, math, async loaders, profiling tools). Importable anywhere without introducing cycles.

## Folder structure

client/src/3d2/
├─ domain/ # Pure game logic (no three.js)
│ ├─ grid/ # WorldGrid, coordinate conversions
│ ├─ nav/ # HexNav, SquareNav implementations
│ ├─ world/ # World generator, biome/terrain rules
│ └─ entities/ # Entity state, movement costs, rules
|
├─ scenes/ # Scene layer: WorldMapScene, ArenaScene
│ ├─ WorldMapScene.ts
│ └─ ArenaScene.ts
|
├─ renderer/ # three.js infrastructure and pipelines
│ ├─ pipeline/ # RenderPipeline implementations
│ ├─ assets/ # AssetStore and loaders
│ ├─ instancing/ # Instancing helpers and geometry managers
│ └─ materials/ # Material builders, lighting utilities
|
├─ interaction/ # Input controllers and interaction adapters
|
├─ integration/ # Thin Vue wrappers (WorldMap.vue, ArenaScene.vue)
|
└─ utils/ # Support utilities (types, math, profiling)

Notes:

- Keep domain/ under no-three.js constraint so it can be unit-tested in Node.
- Scenes compose domain + renderer; they may depend on renderer and domain but domain must not depend on renderer.

## Allowed dependencies / import rules (recommended)

Domain (domain/) → (can be used by) Scene layer (scenes/)
Scene layer (scenes/) → Rendering infra (renderer/), Interaction (interaction/)
Rendering infra (renderer/) → may use utils/
Integration (integration/) → scenes/, interaction/
Support utils (utils/) → import-able by any layer but must be dependency-light and free of cycles.

In short: domain must not import renderer or three.js; scenes may import both domain and renderer.

## Minimal contract for a Scene instance

- init(options?): Promise<void> — set up pipeline, load assets, wire domain -> renderer
- tick(dt: number): void — advance animations, run one frame step for domain/scene
- resize(width: number, height: number): void — update camera/pipeline sizes
- dispose(): void — free GPU resources and stop loops

## Error modes

init may fail on missing assets or bad configuration (rejects promise). tick should defensively handle missing resources.

- If an asset it missing, use a small, hot-pink square as a fallback to provide visual feedback of an error.
- If configuration is malformed or bad, do an alert() warning the user of the app to contact a developer

## Edge cases to consider

- Running without WebGL (headless tests) — domain must work headless.
- Large worlds / LOD — ensure chunk managers can stream and cull.
- Input race conditions — decouple input sampling from render thread where possible.
- Hot reload / dispose — scenes must cleanly release GPU resources to avoid memory leaks.

## Performance rules

- Target 120 fps where feasible; avoid per-frame allocations and prefer instancing.
- Prefer pooling for temporary objects and reuse geometries/materials across chunks.
- Each step in the rendering process must produce metrics that have negligible impact on the rendering times
- For metrics that cannot be obtained without impacting performance, they may be safely ignored until a need arises

## Optimization considerations

We want to be intelligently examining each piece of code we add to 3d2, making sure it's designed in the most performant way. It is critical that we don't lose functionality, but any detours for improvements to performance should be flagged to the user for approval.
