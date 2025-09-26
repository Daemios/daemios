Prisma notes and developer instructions

- This project uses Prisma (schema located at `prisma/schema.prisma`). The datasource configured in the existing schema is MySQL/MariaDB.

- To generate the Prisma client (do this after setting `DATABASE_URL` in your environment or `.env`):

```powershell
# from server/ folder
npx prisma generate
```

- To create a local migration and apply it (requires a reachable dev DB):

```powershell
npx prisma migrate dev --name init
```

- If you prefer a no-db dev experience, consider switching the `datasource` in `prisma/schema.prisma` to SQLite for local development, or keep the schema and use a disposable local MySQL instance.

- Note: the project includes a dev-safe Prisma client in `src/db/prisma.ts` that uses a global variable to avoid multiple client instances in watch mode.
