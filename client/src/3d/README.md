# 3D Module

This folder contains the 3D engine and related systems.

## Layers and responsibilities

- **core/** – scene controller, render pipeline, asset store, and shared types.
- **grids/** – coordinate conversions; works with core types.
- **nav/** – pathfinding built on grids.
- **terrain/** – biome and height utilities used by world generation.
- **world/** – procedural world data built from terrain.
- **renderer/** – WebGL helpers for chunked rendering and materials.
- **arena/** – example combat scene combining core, grids, and nav.
- **worldmap/** – map scene combining core, grids, nav, world, and renderer.
- **background/** – lightweight Three.js background for non-game views.

## Performance rules

- Target **120 fps**; avoid heavy per-frame allocations and prefer instancing.
- If a Vuetify class provides a visual style, **do not** add duplicate CSS.

## Allowed dependencies

```
terrain → world → renderer
               ↘         ↘
core ← grids ← nav ← scenes (arena, worldmap, background)
```

`A → B` means *A may import B*.

- `grids` → `core`
- `nav` → `grids`, `core`
- `world` → `terrain`
- `renderer` → `world`
- scenes → `core`, `grids`, `nav`, `world`, `renderer`
