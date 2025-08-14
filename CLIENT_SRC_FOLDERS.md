# client/src — Folder map

This document maps the folders under `client/src` to short, high-level purposes. It intentionally avoids listing or describing specific files.

## Top-level folders

- 3d/

  - 3D engine, scene controllers, rendering pipeline, grids, navigation and world generation code used for map and gameplay visuals.

- components/

  - Reusable Vue UI components grouped by feature (ability, character, dialogs, general, inventory, overlay, world, etc.).

- router/

  - Routing configuration and route definitions for the application.

- stores/

  - Application state management (stores for world, user, socket, settings, dialogs, data, audio, chat, etc.).

- utils/

  - Small helper libraries and utilities (API client, socket wrapper, audio helpers, keybinds, profiler, etc.).

- i18n/

  - Internationalization resources and formatters for localization.

- views/

  - Page-level Vue views organized by purpose (primary app pages, legacy/old views, hidden or utility pages).

- vuetify/

  - UI framework setup, plugin wiring and theme definitions.

- lib/
  - Project-specific shared helper code or small libraries used by the client.

## Additional notes

- The repository root also contains a few top-level client entry files (app bootstrap and root component) outside these folders; this map focuses on folders only as requested.

- If you want this document extended into a CONTRIBUTING or developer QUICKSTART file with pointers on where to start for common tasks (UI, 3D, state, networking), I can add that as a follow-up.
