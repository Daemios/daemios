3d2 - Lightweight renderer & domain helpers

Purpose

This folder contains the new "3d2" runtime: a slim, dependency-light set of domain and renderer adapters
that replace the legacy `@/3d` implementations incrementally.

Key modules

- domain/ - world/domain logic (seeded RNG, generators, grid, nav, entities)
- renderer/ - small renderer helpers (rendererManager, composer, instancing, materials)
- scenes/ - scene implementations which consume only domain + renderer helpers
- interaction/ - DOM-friendly interaction utilities (EntityPicker)
- integration/ - thin Vue wrapper components (WorldMapSceneWrapper.vue)

Scene contract (WorldMapScene)

A scene implementation should export a class with the following methods (used by the wrapper):

- constructor(container)
- init() - initialize scene, camera, renderer; may dynamically import controls
- tick(time) - called every RAF step to update & render
- resize(w, h) - adjust renderer/camera sizes
- dispose() - cleanup listeners, dispose resources

Optional convenience APIs implemented by WorldMapScene:

- setGridRadius(radius)
- showEntities(entities)
- setOnSelect(callback)
- getSelected()
- centerOn(q, r)
- zoomTo(distance)
- resetView()

Coordinate conventions

- World and renderer components exchange cell positions using world-space Cartesian coordinates `{ x, z }`.
- Convert to axial `{ q, r }` with `XZToAxial` only at the point of geometry instancing or chunk enumeration.
- Upstream systems should avoid passing axial coordinates directly to rendering utilities.

Renderer helpers

- createRendererManager(options) -> { renderer, composer?, setSize, render, dispose }
- createComposer(renderer, scene, camera) -> attempts to create EffectComposer (may return null)
- createInstancedMesh(geometry, material, count) -> { instancedMesh, setInstanceMatrix, dispose }
- basic material factories in basicMaterials.js

Notes

- Examples (`three/examples/jsm/*`) are dynamically imported to avoid bundling them into SSR builds.
- Where helpers are unavailable (example: composer), scenes should fall back to direct renderer.render.

"3d2" is intended to be an incremental, well-contained migration surface. Create small shims in
`client/src/3d` to re-export `3d2` modules during the rollout to avoid touching many legacy import sites at once.
