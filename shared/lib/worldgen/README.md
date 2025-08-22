Shared world generation library

Purpose
- Provide a deterministic, dependency-light API for generating tile data used by both server and client.

API
- generateTile(seed, q, r, cfgPartial) -> Tile object
- getDefaultConfig() -> default config

Tile shape (partial)
- q, r, seed
- elevation: { raw, normalized }
- bathymetry: { depthBand, seaLevel }
- slope
- palette: { topColor, sideColor, id }
- plate: { id, edgeDistance }

Notes
- This is an initial skeleton. More layers and stricter contracts will be added incrementally.
