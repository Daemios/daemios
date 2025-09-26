# Daemios API (server)

This folder contains the server-side API. The repository is part of a monorepo — shared dev tools (Vitest, linting) live at the repo root. Notes:

- To run unit tests from the server package you should use the monorepo-provided `vitest` binary. From the repo root run:

```powershell
# from monorepo root
vitest
```

- Local scripts (server package):

```powershell
# build TypeScript sources
npm run build

# start TypeScript dev server (requires dev deps installed)
npm run dev:ts

# run legacy tests
npm test

# run unit tests if vitest is available in PATH (prefer monorepo root)
npm run test:unit
```

- Environment variables: copy `.env.example` and set `DATABASE_URL` for your dev DB.

Notes:

- This folder intentionally does not duplicate root-level dev tools. Use the monorepo root versions to keep versions consistent across packages.
