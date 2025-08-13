# Daemios Monorepo

This repository contains both the client and server projects for Daemios.

## Structure

- `client/` — Vue/Vite frontend
- `server/` — Backend server
- `shared/` — (Optional) Shared code for both client and server

## Usage

### Install dependencies

```
npm run install:all
```

### Run both client and server

```
npm run dev
```

## Environment Variables

- Use separate `.env` files in `client` and `server`.
- For Vite, client env vars must start with `VITE_`.

## Notes

- Keep configs and dependencies isolated in each folder.
- Add shared code to `shared/` if needed.
