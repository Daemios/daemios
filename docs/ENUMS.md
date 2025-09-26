Equipment enums (source of truth)

- The Prisma schema (`server/prisma/schema.prisma`) is the source of truth for enum tokens.
- The shared TypeScript runtime constants in `shared/types/enums.ts` must match the Prisma enum values exactly.

How to update enums correctly

1. Update the enum in `server/prisma/schema.prisma`.
2. Run `npx prisma generate` and (if required) `npx prisma db push` to update database mapping.
3. Update `shared/types/enums.ts` to mirror the enum tokens exactly (use the same uppercase strings).
4. Update any code that maps UI slot ids to enum tokens (client side) so the client sends the canonical token only.
5. Update tests/seed files to use the canonical tokens.

Notes

- UI labels may use human-friendly names (e.g., `slot-name="backpack"` or label="Backpack"). Those should NOT be changed to Prisma tokens — they represent UI identifiers/labels. The mapping layer (client) is responsible for converting UI ids to the canonical enum tokens.
- Server routes should validate incoming enum tokens against the Prisma enum and reject invalid values with clear 400 responses.

Purpose

This policy avoids accidental fallbacks or one-off string conversions that allow invalid or legacy tokens to be accepted by the server. Always keep the Prisma schema and `shared/types/enums.ts` in sync.
